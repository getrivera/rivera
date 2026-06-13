'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'
import { createInvoice } from './invoices'
import { createBuyerVirtualAccount } from './virtual-accounts'
import { VA_ENABLED } from '@/lib/paystack-va'
import { VA_DEMO_MODE } from '@/lib/va-demo'
import { hasCompanyPaystackConfig } from '@/lib/paystack-company'
import { createCommission, checkCommissionTrigger } from './commissions'
import { can, type StaffRole } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

type StaffRecord = { company_id: string; role: string }

export async function registerSale(formData: FormData): Promise<ActionResult> {
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

  if (!can.registerSale(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to register sales' }
  }

  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const nin = formData.get('nin') as string
  const listingId = formData.get('listing_id') as string
  const installmentPlanId = (formData.get('installment_plan_id') as string) || null
  const nextOfKinName = formData.get('next_of_kin_name') as string
  const nextOfKinPhone = formData.get('next_of_kin_phone') as string
  const notes = formData.get('notes') as string
  const unitQuantity = parseInt(formData.get('unit_quantity') as string) || 1

  const partnerCompanyRaw = formData.get('partner_company_id') as string | null

  let partnerId: string | null = null
  let referringPartnerCompanyId: string | null = null

  if (partnerCompanyRaw) {
    try {
      const parsed = JSON.parse(partnerCompanyRaw) as {
        pcId: string
        partnerId: string | null
      }
      partnerId = parsed.partnerId
      referringPartnerCompanyId = parsed.pcId
    } catch {
      // fallback — treat as direct sale
    }
  }

  if (!fullName || !phone || !listingId) {
    return { success: false, error: 'Full name, phone and listing are required' }
  }

  if (isNaN(unitQuantity) || unitQuantity < 1) {
    return { success: false, error: 'Unit quantity must be at least 1' }
  }

  // Verify the listing belongs to this company
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingCheckRaw } = await (adminClient as any)
    .from('listings')
    .select('id, company_id')
    .eq('id', listingId)
    .eq('company_id', staff.company_id)
    .single()

  if (!listingCheckRaw) {
    return { success: false, error: 'Listing not found' }
  }

  // Verify the chosen installment plan belongs to the chosen listing —
  // previously a plan from any listing (or any company) was accepted.
  if (installmentPlanId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planCheckRaw } = await (adminClient as any)
      .from('installment_plans')
      .select('id')
      .eq('id', installmentPlanId)
      .eq('listing_id', listingId)
      .eq('company_id', staff.company_id)
      .single()

    if (!planCheckRaw) {
      return { success: false, error: 'The selected payment plan does not belong to this listing' }
    }
  }

  const source = referringPartnerCompanyId ? 'partner' : 'direct'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saleRaw, error } = await (adminClient as any)
    .from('buyers')
    .insert({
      company_id: staff.company_id,
      partner_id: partnerId,
      referring_partner_company_id: referringPartnerCompanyId,
      listing_id: listingId,
      installment_plan_id: installmentPlanId,
      source,
      registered_by: user.id,
      full_name: fullName,
      phone,
      email: email || null,
      nin: nin || null,
      next_of_kin_name: nextOfKinName || null,
      next_of_kin_phone: nextOfKinPhone || null,
      notes: notes || null,
      status: 'pending_deposit',
      unit_quantity: unitQuantity,
    })
    .select('id')
    .single()

  if (error || !saleRaw) {
    console.error('SALE INSERT FAILED:', {
      error: error?.message,
      code: error?.code,
      company_id: staff.company_id,
      listing_id: listingId,
    })
    return { success: false, error: 'Failed to register sale. Please try again.' }
  }

  const sale = saleRaw as { id: string }

  await createInvoice(sale.id)
  await createCommission(sale.id, staff.company_id)

  // Auto-create VA if company has Paystack connected or Rivera VA enabled
  if (!VA_DEMO_MODE) {
    const hasPaystack = await hasCompanyPaystackConfig(staff.company_id)
    if (hasPaystack || VA_ENABLED) {
      await createBuyerVirtualAccount(sale.id)
    }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'sale.registered',
    entityType: 'sale',
    entityId: sale.id,
    entityLabel: fullName,
    metadata: {
      source,
      listing_id: listingId,
      partner_id: partnerId ?? undefined,
      unit_quantity: unitQuantity,
    },
  })

  revalidatePath('/sales')
  revalidateTag('dashboard')
  redirect(`/sales/${sale.id}`)
}

const VALID_SALE_STATUSES = [
  'pending_deposit',
  'on_track',
  'overdue',
  'fully_paid',
  'defaulted',
  'cancelled',
] as const

export async function updateSaleStatus(
  saleId: string,
  status: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Whitelist — previously any arbitrary string was written to the column
  if (!VALID_SALE_STATUSES.includes(status as (typeof VALID_SALE_STATUSES)[number])) {
    return { success: false, error: 'Invalid sale status' }
  }

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
    return { success: false, error: 'You do not have permission to update sale status' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('buyers')
    .update({ status })
    .eq('id', saleId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('SALE STATUS UPDATE FAILED:', {
      error: error?.message,
      code: error?.code,
      company_id: staff.company_id,
      sale_id: saleId,
    })
    return { success: false, error: 'Failed to update sale status' }
  }

  // When marked fully paid — update invoice and trigger commission
  if (status === 'fully_paid') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoiceRaw } = await (adminClient as any)
      .from('buyer_invoices')
      .select('id, total_kobo')
      .eq('buyer_id', saleId)
      .eq('company_id', staff.company_id)
      .neq('status', 'voided')
      .single()

    const invoice = invoiceRaw as { id: string; total_kobo: number } | null

    if (invoice) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('buyer_invoices')
        .update({
          status: 'paid',
          amount_paid_kobo: invoice.total_kobo,
        })
        .eq('id', invoice.id)
    }

    await checkCommissionTrigger(saleId, staff.company_id, 'fully_paid')
  }

  // When deposit confirmed — trigger deposit commission
  if (status === 'on_track') {
    await checkCommissionTrigger(saleId, staff.company_id, 'deposit_received')
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'sale.status_updated',
    entityType: 'sale',
    entityId: saleId,
    entityLabel: `Status updated to ${status.replace(/_/g, ' ')}`,
    metadata: { status },
  })

  revalidatePath('/sales')
  revalidatePath(`/sales/${saleId}`)
  revalidateTag('dashboard')
  return { success: true, data: undefined }
}