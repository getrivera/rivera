'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { can, type StaffRole } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

type StaffRecord = { company_id: string; role: string }

// ── Commission event history ──────────────────────────────────────────────
// Append-only log of every status transition (table: commission_events,
// see supabase/migrations/20260611100000_commission_decline_and_events.sql)

async function recordCommissionEvent({
  companyId,
  commissionId,
  eventType,
  fromStatus,
  toStatus,
  note,
  performedBy,
}: {
  companyId: string
  commissionId: string
  eventType: string
  fromStatus?: string
  toStatus?: string
  note?: string | null
  performedBy?: string
}): Promise<void> {
  try {
    const adminClient = createAdminClient()

    let performedByName: string | null = null
    if (performedBy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRaw } = await (adminClient as any)
        .from('profiles')
        .select('full_name')
        .eq('id', performedBy)
        .single()
      performedByName = (profileRaw as { full_name: string } | null)?.full_name ?? null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('commission_events')
      .insert({
        company_id: companyId,
        commission_id: commissionId,
        event_type: eventType,
        from_status: fromStatus ?? null,
        to_status: toStatus ?? null,
        note: note || null,
        performed_by: performedBy ?? null,
        performed_by_name: performedByName,
      })
  } catch (err) {
    // History is best-effort — never block the status change itself
    console.error('COMMISSION EVENT LOG FAILED:', err)
  }
}

// ── Create commission when a referred sale is registered ──────────────────

export async function createCommission(
  saleId: string,
  companyId: string
): Promise<void> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saleRaw } = await (adminClient as any)
    .from('buyers')
    .select('partner_id, referring_partner_company_id, listing_id, source, unit_quantity')
    .eq('id', saleId)
    .single()

  const sale = saleRaw as {
    partner_id: string | null
    referring_partner_company_id: string | null
    listing_id: string
    source: string
    unit_quantity: number | null
  } | null

  if (!sale || sale.source !== 'partner') return

  const quantity = Math.max(1, sale.unit_quantity ?? 1)

  let partnerId = sale.partner_id

  if (!partnerId && sale.referring_partner_company_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pcRaw } = await (adminClient as any)
      .from('partner_companies')
      .select('partner_id')
      .eq('id', sale.referring_partner_company_id)
      .single()

    const pc = pcRaw as { partner_id: string | null } | null
    partnerId = pc?.partner_id ?? null
  }

  if (!partnerId) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingRaw } = await (adminClient as any)
    .from('listings')
    .select('commission_type, commission_value, commission_trigger, price_kobo')
    .eq('id', sale.listing_id)
    .single()

  const listing = listingRaw as {
    commission_type: string
    commission_value: number
    commission_trigger: string
    price_kobo: number
  } | null

  if (!listing) return

  // Commission scales with the number of units sold — both fixed (per-unit)
  // and percentage (of the total sale value) types.
  let amountKobo = 0
  if (listing.commission_type === 'fixed') {
    amountKobo = listing.commission_value * quantity
  } else {
    amountKobo = Math.round((listing.commission_value / 100) * listing.price_kobo * quantity)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('commissions')
    .insert({
      company_id: companyId,
      partner_id: partnerId,
      buyer_id: saleId,
      listing_id: sale.listing_id,
      amount_kobo: amountKobo,
      trigger_event: listing.commission_trigger,
      status: 'pending',
    })
}

// ── Check and update commission trigger ──────────────────────────────────

export async function checkCommissionTrigger(
  saleId: string,
  companyId: string,
  eventType: 'deposit_received' | 'installment_paid' | 'fully_paid' | 'milestone_reached'
): Promise<void> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commissionRaw } = await (adminClient as any)
    .from('commissions')
    .select('id, trigger_event, status')
    .eq('buyer_id', saleId)
    .eq('company_id', companyId)
    .in('status', ['pending', 'due'])
    .single()

  const commission = commissionRaw as {
    id: string
    trigger_event: string
    status: string
  } | null

  if (!commission) return

  const shouldTrigger =
    (commission.trigger_event === 'on_deposit' && eventType === 'deposit_received') ||
    (commission.trigger_event === 'per_installment' && eventType === 'installment_paid') ||
    (commission.trigger_event === 'on_full_payment' && eventType === 'fully_paid') ||
    (commission.trigger_event === 'on_milestone' && eventType === 'milestone_reached')

  if (!shouldTrigger) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('commission_payout_mode')
    .eq('id', companyId)
    .single()

  const company = companyRaw as { commission_payout_mode: string } | null
  const newStatus = company?.commission_payout_mode === 'auto_approve' ? 'approved' : 'due'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('commissions')
    .update({
      status: newStatus,
      triggered_at: new Date().toISOString(),
    })
    .eq('id', commission.id)
}

// ── Approve commission ────────────────────────────────────────────────────

export async function approveCommission(commissionId: string): Promise<ActionResult> {
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

  if (!can.approveCommissions(staff.role as StaffRole)) {
    return { success: false, error: 'Only admin and finance can approve commissions' }
  }

  // Read current status for the event log + clear any prior decline/failure note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentRaw } = await (adminClient as any)
    .from('commissions')
    .select('status')
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .single()

  const current = currentRaw as { status: string } | null
  if (!current) return { success: false, error: 'Commission not found' }

  const approvableFrom = ['due', 'failed', 'returned', 'declined']
  if (!approvableFrom.includes(current.status)) {
    return { success: false, error: `Cannot approve a commission in '${current.status.replace(/_/g, ' ')}' status` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('commissions')
    .update({ status: 'approved', status_note: null, declined_at: null })
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .in('status', approvableFrom)

  if (error) {
    console.error('COMMISSION APPROVE FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      commission_id: commissionId,
    })
    return { success: false, error: 'Failed to approve commission' }
  }

  await recordCommissionEvent({
    companyId: staff.company_id,
    commissionId,
    eventType: current.status === 'due' ? 'approved' : 'reapproved',
    fromStatus: current.status,
    toStatus: 'approved',
    performedBy: user.id,
  })

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'commission.approved',
    entityType: 'commission',
    entityId: commissionId,
  })

  revalidatePath('/commissions')
  return { success: true, data: undefined }
}

// ── Decline commission (requires a note) ──────────────────────────────────

export async function declineCommission(
  commissionId: string,
  note: string
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

  if (!can.approveCommissions(staff.role as StaffRole)) {
    return { success: false, error: 'Only admin and finance can decline commissions' }
  }

  // Note is REQUIRED — declines must always be explainable to the partner
  const trimmedNote = (note ?? '').trim()
  if (trimmedNote.length < 5) {
    return { success: false, error: 'A note explaining the decline is required (at least 5 characters)' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentRaw } = await (adminClient as any)
    .from('commissions')
    .select('status')
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .single()

  const current = currentRaw as { status: string } | null
  if (!current) return { success: false, error: 'Commission not found' }

  const declinableFrom = ['due', 'approved']
  if (!declinableFrom.includes(current.status)) {
    return { success: false, error: `Cannot decline a commission in '${current.status.replace(/_/g, ' ')}' status` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('commissions')
    .update({
      status: 'declined',
      status_note: trimmedNote,
      declined_at: new Date().toISOString(),
    })
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .in('status', declinableFrom)

  if (error) {
    console.error('COMMISSION DECLINE FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      commission_id: commissionId,
    })
    return { success: false, error: 'Failed to decline commission. Make sure the latest database migration has been applied.' }
  }

  await recordCommissionEvent({
    companyId: staff.company_id,
    commissionId,
    eventType: 'declined',
    fromStatus: current.status,
    toStatus: 'declined',
    note: trimmedNote,
    performedBy: user.id,
  })

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'commission.declined',
    entityType: 'commission',
    entityId: commissionId,
    metadata: { note: trimmedNote },
  })

  revalidatePath('/commissions')
  return { success: true, data: undefined }
}

// ── Mark commission as processing ─────────────────────────────────────────

export async function markCommissionProcessing(
  commissionId: string,
  transferReference: string
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

  if (!can.approveCommissions(staff.role as StaffRole)) {
    return { success: false, error: 'Only admin and finance can process commissions' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('commissions')
    .update({
      status: 'processing',
      transfer_reference: transferReference,
      initiated_by: user.id,
    })
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .eq('status', 'approved')

  if (error) {
    console.error('COMMISSION PROCESSING FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      commission_id: commissionId,
    })
    return { success: false, error: 'Failed to mark commission as processing' }
  }

  await recordCommissionEvent({
    companyId: staff.company_id,
    commissionId,
    eventType: 'processing',
    fromStatus: 'approved',
    toStatus: 'processing',
    note: transferReference ? `Transfer ref: ${transferReference}` : null,
    performedBy: user.id,
  })

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'commission.processing',
    entityType: 'commission',
    entityId: commissionId,
    metadata: { transfer_reference: transferReference },
  })

  revalidatePath('/commissions')
  return { success: true, data: undefined }
}

// ── Mark commission as paid ───────────────────────────────────────────────

export async function markCommissionPaid(commissionId: string): Promise<ActionResult> {
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

  if (!can.approveCommissions(staff.role as StaffRole)) {
    return { success: false, error: 'Only admin and finance can confirm payments' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('commissions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .eq('status', 'processing')

  if (error) {
    console.error('COMMISSION PAID FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      commission_id: commissionId,
    })
    return { success: false, error: 'Failed to mark commission as paid' }
  }

  await recordCommissionEvent({
    companyId: staff.company_id,
    commissionId,
    eventType: 'paid',
    fromStatus: 'processing',
    toStatus: 'paid',
    performedBy: user.id,
  })

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'commission.paid',
    entityType: 'commission',
    entityId: commissionId,
  })

  revalidatePath('/commissions')
  return { success: true, data: undefined }
}

// ── Mark commission as failed or returned ─────────────────────────────────

export async function markCommissionFailed(
  commissionId: string,
  status: 'failed' | 'returned',
  note: string
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

  if (!can.approveCommissions(staff.role as StaffRole)) {
    return { success: false, error: 'Only admin and finance can update commission status' }
  }

  // A note is required — failures/returns must be explainable later
  const trimmedNote = (note ?? '').trim()
  if (trimmedNote.length < 5) {
    return {
      success: false,
      error: `A note explaining why the payment ${status === 'failed' ? 'failed' : 'was returned'} is required (at least 5 characters)`,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('commissions')
    .update({ status, status_note: trimmedNote })
    .eq('id', commissionId)
    .eq('company_id', staff.company_id)
    .eq('status', 'processing')

  if (error) {
    console.error('COMMISSION FAILED/RETURNED UPDATE FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      commission_id: commissionId,
    })
    return { success: false, error: 'Failed to update commission status' }
  }

  await recordCommissionEvent({
    companyId: staff.company_id,
    commissionId,
    eventType: status,
    fromStatus: 'processing',
    toStatus: status,
    note: trimmedNote,
    performedBy: user.id,
  })

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: status === 'failed' ? 'commission.failed' : 'commission.returned',
    entityType: 'commission',
    entityId: commissionId,
    metadata: { note: trimmedNote },
  })

  revalidatePath('/commissions')
  return { success: true, data: undefined }
}