'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { can, type StaffRole } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

type StaffRecord = { company_id: string; role: string }

// ── Invite partner by email ───────────────────────────────────────────────

export async function invitePartnerByEmail(formData: FormData): Promise<ActionResult> {
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

  if (!can.managePartners(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to invite partners' }
  }

  const email = formData.get('email') as string
  const name = formData.get('name') as string

  if (!email) return { success: false, error: 'Email is required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('name, slug, company_code')
    .eq('id', staff.company_id)
    .single()

  const company = companyRaw as { name: string; slug: string; company_code: string } | null
  if (!company) return { success: false, error: 'Company not found' }

  const { data: existingPartnerRaw } = await supabase
    .from('partners')
    .select('id, user_id')
    .eq('email', email)
    .single()

  const existingPartner = existingPartnerRaw as { id: string; user_id: string } | null

  if (existingPartner) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingData } = await (adminClient as any)
      .from('partner_companies')
      .select('id, status')
      .eq('partner_id', existingPartner.id)
      .eq('company_id', staff.company_id)
      .single()

    const existing = existingData as { id: string; status: string } | null

    if (existing) {
      return { success: false, error: 'This partner is already in your network' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('partner_companies')
      .insert({
        partner_id: existingPartner.id,
        company_id: staff.company_id,
        status: 'invited',
        join_method: 'email_invite',
        invited_by: user.id,
        invited_email: email,
        invited_name: name || null,
      })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingInviteRaw } = await (adminClient as any)
      .from('partner_companies')
      .select('id')
      .eq('invited_email', email)
      .eq('company_id', staff.company_id)
      .single()

    const existingInvite = existingInviteRaw as { id: string } | null

    if (existingInvite) {
      return { success: false, error: 'An invite has already been sent to this email' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('partner_companies')
      .insert({
        partner_id: null,
        company_id: staff.company_id,
        status: 'invited',
        join_method: 'email_invite',
        invited_by: user.id,
        invited_email: email,
        invited_name: name || null,
      })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('company_onboarding')
    .update({ first_partner_invited: true })
    .eq('company_id', staff.company_id)

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'partner.invited',
    entityType: 'partner',
    entityLabel: email,
    metadata: { name: name || null },
  })

  revalidatePath('/partners')
  revalidatePath('/dashboard')
  return { success: true, data: { email, companyName: company.name } }
}

// ── Update partner status ─────────────────────────────────────────────────

export async function updatePartnerStatus(
  partnerCompanyId: string,
  status: 'active' | 'suspended' | 'removed'
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

  if (!can.managePartners(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage partners' }
  }

  if (status === 'removed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('partner_companies')
      .delete()
      .eq('id', partnerCompanyId)
      .eq('company_id', staff.company_id)

    if (error) return { success: false, error: 'Failed to remove partner' }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('partner_companies')
      .update({ status })
      .eq('id', partnerCompanyId)
      .eq('company_id', staff.company_id)

    if (error) return { success: false, error: 'Failed to update partner status' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: status === 'removed'
      ? 'partner.removed'
      : status === 'suspended'
      ? 'partner.suspended'
      : 'partner.activated',
    entityType: 'partner',
    entityId: partnerCompanyId,
  })

  revalidatePath('/partners')
  return { success: true, data: undefined }
}

// ── Bulk invite partners ──────────────────────────────────────────────────

export async function bulkInvitePartners(
  partners: { name: string; email: string; phone: string }[]
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

  if (!can.managePartners(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to invite partners' }
  }

  const { data: existingRaw } = await supabase
    .from('partner_companies')
    .select('invited_email')
    .eq('company_id', staff.company_id)

  const existing = (existingRaw ?? []) as { invited_email: string | null }[]
  const existingEmails = new Set(
    existing.map((e) => e.invited_email?.toLowerCase()).filter(Boolean)
  )

  const toInsert = partners.filter(
    (p) => !existingEmails.has(p.email.toLowerCase())
  )

  const skipped = partners.length - toInsert.length

  if (toInsert.length === 0) {
    return { success: true, data: { imported: 0, skipped } }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('partner_companies')
    .insert(
      toInsert.map((p) => ({
        partner_id: null,
        company_id: staff.company_id,
        status: 'invited',
        join_method: 'email_invite',
        invited_by: user.id,
        invited_email: p.email,
        invited_name: p.name || null,
      }))
    )

  if (error) {
    console.error('BULK INVITE FAILED:', {
      error: error.message,
      code: error.code,
      company_id: staff.company_id,
    })
    return { success: false, error: 'Failed to import partners. Please try again.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('company_onboarding')
    .update({ first_partner_invited: true })
    .eq('company_id', staff.company_id)

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'partner.invited',
    entityLabel: `Bulk import — ${toInsert.length} partners invited`,
    metadata: { imported: toInsert.length, skipped },
  })

  revalidatePath('/partners')
  revalidatePath('/dashboard')
  return { success: true, data: { imported: toInsert.length, skipped } }
}