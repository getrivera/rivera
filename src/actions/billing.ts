'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { BILLING_ENABLED, calculateAddonCharges, currentMonth } from '@/lib/billing'
import { generateReference, initializeTransaction } from '@/lib/paystack'

type StaffRecord = { company_id: string; role: string }

// ── Get billing overview for a company ────────────────────────────────────

export async function getBillingOverview(companyId: string) {
  const adminClient = createAdminClient()
  const month = currentMonth()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subRaw, usageRaw, invoicesRaw, plansRaw] = await Promise.all([
    (adminClient as any)
      .from('company_subscriptions')
      .select(`
        status, plan_slug, billing_cycle, price_kobo_per_cycle,
        trial_ends_at, current_period_start, current_period_end,
        grace_period_ends_at
      `)
      .eq('company_id', companyId)
      .single(),

    (adminClient as any)
      .from('company_usage')
      .select('*')
      .eq('company_id', companyId)
      .eq('month', month)
      .single(),

    (adminClient as any)
      .from('rivera_invoices')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(12),

    (adminClient as any)
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_kobo_monthly', { ascending: true }),
  ])

  return {
    subscription: subRaw.data,
    usage: usageRaw.data,
    invoices: invoicesRaw.data ?? [],
    plans: plansRaw.data ?? [],
  }
}

// ── Initiate subscription payment ─────────────────────────────────────────

export async function initiateSubscriptionPayment(
  planSlug: string,
  billingCycle: 'monthly' | 'quarterly' | 'annual'
): Promise<ActionResult> {
  if (!BILLING_ENABLED) {
    return { success: false, error: 'Billing is not enabled yet.' }
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  if (staff.role !== 'admin') {
    return { success: false, error: 'Only admins can manage subscriptions' }
  }

  // Get plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: planRaw } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .single()

  if (!planRaw) return { success: false, error: 'Plan not found' }

  const plan = planRaw as { id: string; slug: string; price_kobo_monthly: number; name: string }

  const cycles = billingCycle === 'annual' ? 12 : billingCycle === 'quarterly' ? 3 : 1
  const totalKobo = plan.price_kobo_monthly * cycles

  const reference = generateReference('SUB')

  const paymentUrl = await initializeTransaction({
    email: user.email!,
    amountKobo: totalKobo,
    reference,
    metadata: {
      company_id: staff.company_id,
      plan_slug: planSlug,
      billing_cycle: billingCycle,
      payment_type: 'subscription',
    },
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?ref=${reference}`,
  })

  if (!paymentUrl) {
    return { success: false, error: 'Failed to initialize payment. Please try again.' }
  }

  // Record pending payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('company_payments')
    .insert({
      company_id: staff.company_id,
      amount_kobo: totalKobo,
      payment_type: 'subscription',
      paystack_reference: reference,
      status: 'pending',
    })

  return { success: true, data: { url: paymentUrl.url, reference } }
}

// ── Generate monthly invoice for a company ────────────────────────────────

export async function generateMonthlyInvoice(
  companyId: string,
  month: string
): Promise<ActionResult> {
  const adminClient = createAdminClient()

  // Get subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subRaw } = await (adminClient as any)
    .from('company_subscriptions')
    .select('plan_slug, billing_cycle, price_kobo_per_cycle, status')
    .eq('company_id', companyId)
    .single()

  if (!subRaw) return { success: false, error: 'No subscription found' }

  const sub = subRaw as {
    plan_slug: string
    billing_cycle: string
    price_kobo_per_cycle: number
    status: string
  }

  // Get usage for month
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usageRaw } = await (adminClient as any)
    .from('company_usage')
    .select('*')
    .eq('company_id', companyId)
    .eq('month', month)
    .single()

  const usage = usageRaw ?? {
    cac_verifications: 0,
    sms_sent: 0,
    emails_sent: 0,
    storage_bytes_used: 0,
  }

  // Calculate add-on charges
  const addonCharges = calculateAddonCharges(usage)
  const addonTotal = addonCharges.reduce((sum, c) => sum + c.totalKobo, 0)

  // Base amount — only for monthly billing
  // Quarterly/annual already paid upfront
  const baseAmount = sub.billing_cycle === 'monthly' ? sub.price_kobo_per_cycle : 0

  const totalKobo = baseAmount + addonTotal

  // Skip if nothing to invoice
  if (totalKobo === 0) {
    return { success: true, data: { skipped: true } }
  }

  // Check if invoice already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRaw } = await (adminClient as any)
    .from('rivera_invoices')
    .select('id')
    .eq('company_id', companyId)
    .eq('month', month)
    .single()

  if (existingRaw) {
    return { success: false, error: 'Invoice already exists for this month' }
  }

  const invoiceNumber = await generateRiveraInvoiceNumber(adminClient)

  // Determine due date — 7 days after invoice creation
  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + 7)

  // Create invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRaw, error } = await (adminClient as any)
    .from('rivera_invoices')
    .insert({
      company_id: companyId,
      invoice_number: invoiceNumber,
      month,
      billing_type: baseAmount > 0 && addonTotal > 0
        ? 'combined'
        : baseAmount > 0 ? 'base' : 'addon',
      base_amount_kobo: baseAmount,
      addon_amount_kobo: addonTotal,
      total_kobo: totalKobo,
      status: 'pending',
      due_at: dueAt.toISOString(),
    })
    .select('id')
    .single()

  if (error || !invoiceRaw) {
    console.error('INVOICE GENERATION FAILED:', error?.message)
    return { success: false, error: 'Failed to generate invoice' }
  }

  const invoice = invoiceRaw as { id: string }

  // Create add-on charge records linked to invoice
  if (addonCharges.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_addon_charges')
      .insert(
        addonCharges.map((c) => ({
          company_id: companyId,
          month,
          charge_type: c.type,
          units_used: c.unitsUsed,
          units_billed: c.unitsBilled,
          unit_price_kobo: c.unitPriceKobo,
          total_kobo: c.totalKobo,
          rivera_invoice_id: invoice.id,
          status: 'pending',
        }))
      )
  }

  revalidatePath('/billing')
  return { success: true, data: { invoiceId: invoice.id, invoiceNumber, totalKobo } }
}

async function generateRiveraInvoiceNumber(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any).rpc('generate_rivera_invoice_number')
  return data as string
}

// ── Initiate invoice payment ───────────────────────────────────────────────

export async function initiateInvoicePayment(invoiceId: string): Promise<ActionResult> {
  if (!BILLING_ENABLED) {
    return { success: false, error: 'Billing is not enabled yet.' }
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRaw } = await (adminClient as any)
    .from('rivera_invoices')
    .select('id, invoice_number, total_kobo, status')
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)
    .single()

  const invoice = invoiceRaw as {
    id: string
    invoice_number: string
    total_kobo: number
    status: string
  } | null

  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') return { success: false, error: 'Invoice already paid' }

  const reference = generateReference('INV')

  const paymentUrl = await initializeTransaction({
    email: user.email!,
    amountKobo: invoice.total_kobo,
    reference,
    metadata: {
      company_id: staff.company_id,
      invoice_id: invoiceId,
      invoice_number: invoice.invoice_number,
      payment_type: 'addon',
    },
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?ref=${reference}`,
  })

  if (!paymentUrl) {
    return { success: false, error: 'Failed to initialize payment. Please try again.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('company_payments')
    .insert({
      company_id: staff.company_id,
      amount_kobo: invoice.total_kobo,
      payment_type: 'addon',
      paystack_reference: reference,
      status: 'pending',
    })

  return { success: true, data: { url: paymentUrl.url, reference } }
}