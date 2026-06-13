'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { checkCommissionTrigger } from './commissions'
import { can, type StaffRole } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { sendInvoiceEmail } from '@/lib/invoice-email'
import { parseNumberInput } from '@/lib/utils'

type StaffRecord = { company_id: string; role: string }

// ── Generate invoice number ───────────────────────────────────────────────

async function generateInvoiceNumber(adminClient: ReturnType<typeof createAdminClient>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any).rpc('generate_invoice_number')
  return data as string
}

async function generateReceiptNumber(adminClient: ReturnType<typeof createAdminClient>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any).rpc('generate_receipt_number')
  return data as string
}

// ── Create invoice for a sale ─────────────────────────────────────────────

export async function createInvoice(saleId: string): Promise<ActionResult> {
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

  if (!can.manageInvoices(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage invoices' }
  }

  const { data: existingRaw } = await supabase
    .from('buyer_invoices')
    .select('id')
    .eq('buyer_id', saleId)
    .eq('company_id', staff.company_id)
    .neq('status', 'voided')
    .single()

  const existing = existingRaw as { id: string } | null
  if (existing) return { success: false, error: 'An invoice already exists for this sale' }

  const { data: saleRaw } = await supabase
    .from('buyers')
    .select('id, full_name, listing_id, installment_plan_id, company_id, unit_quantity')
    .eq('id', saleId)
    .eq('company_id', staff.company_id)
    .single()

  if (!saleRaw) return { success: false, error: 'Sale not found' }

  const sale = saleRaw as {
    id: string
    full_name: string
    listing_id: string
    installment_plan_id: string | null
    company_id: string
    unit_quantity: number | null
  }

  const quantity = Math.max(1, sale.unit_quantity ?? 1)

  const { data: listingRaw } = await supabase
    .from('listings')
    .select('price_kobo')
    .eq('id', sale.listing_id)
    .single()

  const listing = listingRaw as { price_kobo: number } | null
  if (!listing) return { success: false, error: 'Listing not found' }

  // Per-unit amount × quantity — previously a 3-unit sale was invoiced for 1
  let totalKobo = listing.price_kobo * quantity

  if (sale.installment_plan_id) {
    const { data: planRaw } = await supabase
      .from('installment_plans')
      .select('deposit_amount_kobo, installment_amount_kobo, installment_count')
      .eq('id', sale.installment_plan_id)
      .single()

    const plan = planRaw as {
      deposit_amount_kobo: number
      installment_amount_kobo: number
      installment_count: number
    } | null

    if (plan) {
      totalKobo =
        (plan.deposit_amount_kobo + plan.installment_amount_kobo * plan.installment_count) * quantity
    }
  }

  const invoiceNumber = await generateInvoiceNumber(adminClient)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRaw, error } = await (adminClient as any)
    .from('buyer_invoices')
    .insert({
      company_id: staff.company_id,
      buyer_id: saleId,
      invoice_number: invoiceNumber,
      status: 'draft',
      total_kobo: totalKobo,
      amount_paid_kobo: 0,
    })
    .select('id')
    .single()

  if (error || !invoiceRaw) {
    console.error('INVOICE CREATE FAILED:', {
      error: error?.message,
      company_id: staff.company_id,
      sale_id: saleId,
    })
    return { success: false, error: 'Failed to create invoice' }
  }

  const invoice = invoiceRaw as { id: string }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'invoice.created',
    entityType: 'invoice',
    entityId: invoice.id,
    entityLabel: invoiceNumber,
    metadata: { sale_id: saleId },
  })

  revalidatePath(`/sales/${saleId}`)
  revalidatePath('/invoices')
  return { success: true, data: { invoiceId: invoice.id, invoiceNumber } }
}

// ── Send invoice ──────────────────────────────────────────────────────────

export async function sendInvoice(invoiceId: string): Promise<ActionResult> {
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

  if (!can.manageInvoices(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage invoices' }
  }

  // Read current status first — never regress partially_paid/paid back to
  // 'sent', and never send voided invoices.
  const { data: invoiceRaw } = await supabase
    .from('buyer_invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)
    .single()

  const invoice = invoiceRaw as { id: string; status: string } | null
  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (invoice.status === 'voided') {
    return { success: false, error: 'Cannot send a voided invoice' }
  }

  // Actually email the buyer (previously this only flipped a status flag)
  const emailResult = await sendInvoiceEmail(invoiceId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('buyer_invoices')
    .update({
      // Only draft → sent; partially_paid/paid keep their payment status
      ...(invoice.status === 'draft' ? { status: 'sent' } : {}),
      sent_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('INVOICE SEND FAILED:', {
      error: error?.message,
      company_id: staff.company_id,
      invoice_id: invoiceId,
    })
    return { success: false, error: 'Failed to send invoice' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'invoice.sent',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: {
      email_sent: emailResult.sent,
      ...(emailResult.reason ? { email_skipped_reason: emailResult.reason } : {}),
    },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)

  if (!emailResult.sent) {
    // Status was still updated — tell the user why no email went out
    return {
      success: true,
      data: { emailSent: false, message: `Invoice marked as sent, but no email was delivered: ${emailResult.reason}` },
    }
  }

  return { success: true, data: { emailSent: true } }
}

// ── Resend invoice ────────────────────────────────────────────────────────

export async function resendInvoice(invoiceId: string): Promise<ActionResult> {
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

  if (!can.manageInvoices(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage invoices' }
  }

  const { data: invoiceRaw } = await supabase
    .from('buyer_invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)
    .single()

  const invoice = invoiceRaw as { id: string; status: string } | null
  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (invoice.status === 'voided') {
    return { success: false, error: 'Cannot resend a voided invoice' }
  }

  const emailResult = await sendInvoiceEmail(invoiceId)
  if (!emailResult.sent) {
    return { success: false, error: emailResult.reason ?? 'Failed to resend invoice' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('buyer_invoices')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'invoice.sent',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: { resend: true },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  return { success: true, data: { emailSent: true } }
}

// ── Void invoice ──────────────────────────────────────────────────────────

export async function voidInvoice(
  invoiceId: string,
  reason: string
): Promise<ActionResult> {
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

  if (!can.manageInvoices(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage invoices' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('buyer_invoices')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: reason,
    })
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('INVOICE VOID FAILED:', {
      error: error?.message,
      company_id: staff.company_id,
      invoice_id: invoiceId,
    })
    return { success: false, error: 'Failed to void invoice' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'invoice.voided',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: { reason },
  })

  revalidatePath('/invoices')
  return { success: true, data: undefined }
}

// ── Record payment ────────────────────────────────────────────────────────

export async function recordPayment(
  invoiceId: string,
  amountNaira: number | string,
  reference: string
): Promise<ActionResult> {
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

  if (!can.manageInvoices(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to record payments' }
  }

  // Comma-safe parsing ("5,000,000" must not become 5)
  const amountParsed = parseNumberInput(amountNaira)
  if (isNaN(amountParsed) || amountParsed <= 0) {
    return { success: false, error: 'Please enter a valid payment amount' }
  }
  const amountKobo = Math.round(amountParsed * 100)

  const { data: invoiceRaw } = await supabase
    .from('buyer_invoices')
    .select('id, total_kobo, amount_paid_kobo, status, buyer_id')
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)
    .single()

  const invoice = invoiceRaw as {
    id: string
    total_kobo: number
    amount_paid_kobo: number
    status: string
    buyer_id: string
  } | null

  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (invoice.status === 'voided') return { success: false, error: 'Cannot record payment on a voided invoice' }
  if (invoice.status === 'paid') return { success: false, error: 'This invoice is already fully paid' }

  const outstanding = invoice.total_kobo - invoice.amount_paid_kobo
  if (amountKobo > outstanding) {
    return {
      success: false,
      error: `Amount exceeds the outstanding balance of ₦${(outstanding / 100).toLocaleString()}. Please check the figure.`,
    }
  }

  const newAmountPaid = invoice.amount_paid_kobo + amountKobo
  const newStatus = newAmountPaid >= invoice.total_kobo ? 'paid' : 'partially_paid'

  const isFirstPayment = invoice.amount_paid_kobo === 0
  const isFullyPaid = newStatus === 'paid'
  const isMilestone =
    invoice.amount_paid_kobo < invoice.total_kobo * 0.5 &&
    newAmountPaid >= invoice.total_kobo * 0.5

  // ── Write the payment FIRST; only fire commission triggers and receipts
  //    after the invoice update has actually succeeded ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient as any)
    .from('buyer_invoices')
    .update({
      amount_paid_kobo: newAmountPaid,
      status: newStatus,
    })
    .eq('id', invoiceId)
    .eq('company_id', staff.company_id)
    // Optimistic-concurrency guard: only update if amount_paid hasn't moved
    // under us (e.g. a VA webhook landed between our read and write).
    .eq('amount_paid_kobo', invoice.amount_paid_kobo)

  if (updateError) {
    console.error('PAYMENT RECORD FAILED:', {
      error: updateError?.message,
      company_id: staff.company_id,
      invoice_id: invoiceId,
    })
    return { success: false, error: 'Failed to record payment' }
  }

  const receiptNumber = await generateReceiptNumber(adminClient)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: receiptError } = await (adminClient as any)
    .from('invoice_receipts')
    .insert({
      company_id: staff.company_id,
      buyer_invoice_id: invoiceId,
      va_transaction_id: reference,
      receipt_number: receiptNumber,
      amount_kobo: amountKobo,
      issued_at: new Date().toISOString(),
    })

  if (receiptError) {
    console.error('RECEIPT INSERT FAILED:', receiptError.message)
  }

  // Buyer status: first payment moves pending_deposit → on_track;
  // full payment → fully_paid
  if (newStatus === 'paid') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('buyers')
      .update({ status: 'fully_paid' })
      .eq('id', invoice.buyer_id)
      .eq('company_id', staff.company_id)
  } else if (isFirstPayment) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('buyers')
      .update({ status: 'on_track' })
      .eq('id', invoice.buyer_id)
      .eq('company_id', staff.company_id)
      .eq('status', 'pending_deposit')
  }

  // Commission triggers — only after the payment is durably recorded
  if (isFirstPayment) {
    await checkCommissionTrigger(invoice.buyer_id, staff.company_id, 'deposit_received')
  }
  if (isFullyPaid) {
    await checkCommissionTrigger(invoice.buyer_id, staff.company_id, 'fully_paid')
  }
  if (isMilestone) {
    await checkCommissionTrigger(invoice.buyer_id, staff.company_id, 'milestone_reached')
  }
  await checkCommissionTrigger(invoice.buyer_id, staff.company_id, 'installment_paid')

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'invoice.payment_recorded',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: {
      amount_kobo: amountKobo,
      receipt_number: receiptNumber,
      new_status: newStatus,
      reference,
    },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath(`/sales/${invoice.buyer_id}`)
  return { success: true, data: { receiptNumber } }
}