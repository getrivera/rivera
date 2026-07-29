'use server'

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { logAudit } from '@/lib/audit'

type StaffRecord = { company_id: string; role: string }

// ── Update company verification details ───────────────────────────────────

export async function updateCompanyDetails(formData: FormData): Promise<ActionResult> {
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

  if (!['admin', 'manager'].includes(staff.role)) {
    return { success: false, error: 'You do not have permission to update company details' }
  }

  const name = formData.get('name') as string
  const rcNumber = formData.get('rc_number') as string
  const commissionPayoutMode = formData.get('commission_payout_mode') as string

  if (!name) return { success: false, error: 'Company name is required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: companyError } = await (adminClient as any)
    .from('companies')
    .update({
      name,
      rc_number: rcNumber || null,
      commission_payout_mode: commissionPayoutMode || 'manual',
    })
    .eq('id', staff.company_id)

  if (companyError) {
    return { success: false, error: 'Failed to update company details' }
  }

  if (rcNumber) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_onboarding')
      .update({ company_verified: true })
      .eq('company_id', staff.company_id)
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.role_changed',
    entityLabel: 'Company details updated',
    metadata: { name, commission_payout_mode: commissionPayoutMode },
  })

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

// ── Update branding ───────────────────────────────────────────────────────

export async function updateBranding(formData: FormData): Promise<ActionResult> {
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

  if (!['admin', 'manager'].includes(staff.role)) {
    return { success: false, error: 'You do not have permission to update branding' }
  }

  const brandColour = formData.get('brand_colour') as string
  const logoFile = formData.get('logo') as File | null

  let logoUrl: string | undefined

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Logo must be under 2MB' }
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(logoFile.type)) {
      return { success: false, error: 'Logo must be a PNG, JPG, WEBP, or SVG file' }
    }

    const ext = logoFile.name.split('.').pop()
    const path = `${staff.company_id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(path, logoFile, { upsert: true })

    if (uploadError) {
      return { success: false, error: 'Failed to upload logo. Please try again.' }
    }

    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(path)

    logoUrl = urlData.publicUrl
  }

  if (brandColour || logoUrl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminClient as any)
      .from('companies')
      .update({
        ...(brandColour && { brand_colour: brandColour }),
        ...(logoUrl && { logo_url: logoUrl }),
      })
      .eq('id', staff.company_id)

    if (updateError) {
      return { success: false, error: 'Failed to update branding' }
    }
  }

  if (logoUrl || brandColour) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_onboarding')
      .update({ branding_complete: true })
      .eq('company_id', staff.company_id)
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.role_changed',
    entityLabel: 'Branding updated',
    metadata: {
      brand_colour: brandColour || null,
      logo_updated: !!logoUrl,
    },
  })

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

// ── Staff management ──────────────────────────────────────────────────────

export async function inviteStaff(formData: FormData): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can invite staff' }
  }

  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const fullName = formData.get('full_name') as string

  if (!email || !role) {
    return { success: false, error: 'Email and role are required' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUsersRaw } = await (adminClient as any)
    .auth.admin.listUsers()

  const existingUsers = existingUsersRaw?.users ?? []
  const existingUser = existingUsers.find((u: { email: string }) => u.email === email)

  if (existingUser) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingStaffRaw } = await (adminClient as any)
      .from('company_staff')
      .select('id')
      .eq('company_id', staff.company_id)
      .eq('user_id', existingUser.id)
      .single()

    const existingStaff = existingStaffRaw as { id: string } | null

    if (existingStaff) {
      return { success: false, error: 'This person is already a staff member' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_staff')
      .insert({
        company_id: staff.company_id,
        user_id: existingUser.id,
        role,
        status: 'active',
        invited_by: user.id,
      })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newUserRaw, error: createError } = await (adminClient as any)
      .auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName || email },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm`,
      })

    if (createError || !newUserRaw?.user) {
      console.error('STAFF INVITE FAILED:', {
        error: createError?.message,
        company_id: staff.company_id,
      })
      return { success: false, error: 'Failed to send invite. Please try again.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_staff')
      .insert({
        company_id: staff.company_id,
        user_id: newUserRaw.user.id,
        role,
        status: 'invited',
        invited_by: user.id,
      })
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.invited',
    entityType: 'staff',
    entityLabel: email,
    metadata: { role, full_name: fullName || null },
  })

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

export async function updateStaffRole(
  staffId: string,
  role: string
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

  if (staff.role !== 'admin') {
    return { success: false, error: 'Only admins can change roles' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('company_staff')
    .update({ role })
    .eq('id', staffId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('STAFF ROLE UPDATE FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      staff_id: staffId,
    })
    return { success: false, error: 'Failed to update role' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.role_changed',
    entityType: 'staff',
    entityId: staffId,
    metadata: { new_role: role },
  })

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

export async function removeStaff(staffId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role, id')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord & { id: string }

  if (staff.role !== 'admin') {
    return { success: false, error: 'Only admins can remove staff' }
  }

  if (staff.id === staffId) {
    return { success: false, error: 'You cannot remove yourself' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('company_staff')
    .delete()
    .eq('id', staffId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('STAFF REMOVE FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      staff_id: staffId,
    })
    return { success: false, error: 'Failed to remove staff member' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.removed',
    entityType: 'staff',
    entityId: staffId,
  })

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

// ── Send a password reset link to an existing staff member ────────────────

export async function resetStaffPassword(staffId: string): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can send password resets' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: targetStaffRaw } = await (adminClient as any)
    .from('company_staff')
    .select('user_id')
    .eq('id', staffId)
    .eq('company_id', staff.company_id)
    .single()

  const targetStaff = targetStaffRaw as { user_id: string } | null
  if (!targetStaff) return { success: false, error: 'Staff member not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRaw } = await (adminClient as any)
    .from('profiles')
    .select('email')
    .eq('id', targetStaff.user_id)
    .single()

  const profile = profileRaw as { email: string } | null
  if (!profile?.email) {
    return { success: false, error: 'Could not find an email address for this staff member' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
  })

  if (error) {
    console.error('STAFF PASSWORD RESET FAILED:', {
      error: error.message,
      company_id: staff.company_id,
      staff_id: staffId,
    })
    return { success: false, error: 'Failed to send password reset email' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.password_reset_sent',
    entityType: 'staff',
    entityId: staffId,
    entityLabel: profile.email,
  })

  return { success: true, data: undefined }
}

// ── Bulk invite staff ─────────────────────────────────────────────────────

export async function bulkInviteStaff(
  members: { name: string; email: string; role: string }[]
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

  if (staff.role !== 'admin') {
    return { success: false, error: 'Only admins can import staff' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUsersRaw } = await (adminClient as any)
    .auth.admin.listUsers()

  const existingUsers = (existingUsersRaw?.users ?? []) as { email: string; id: string }[]

  const { data: existingStaffRaw } = await supabase
    .from('company_staff')
    .select('user_id')
    .eq('company_id', staff.company_id)

  const existingStaff = (existingStaffRaw ?? []) as { user_id: string }[]
  const existingStaffIds = new Set(existingStaff.map((s) => s.user_id))

  let imported = 0
  let skipped = 0

  for (const member of members) {
    const existingUser = existingUsers.find(
      (u) => u.email.toLowerCase() === member.email.toLowerCase()
    )

    if (existingUser) {
      if (existingStaffIds.has(existingUser.id)) {
        skipped++
        continue
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('company_staff')
        .insert({
          company_id: staff.company_id,
          user_id: existingUser.id,
          role: member.role,
          status: 'active',
          invited_by: user.id,
        })
      imported++
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUserRaw, error: createError } = await (adminClient as any)
        .auth.admin.inviteUserByEmail(member.email, {
          data: { full_name: member.name },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm`,
        })

      if (createError || !newUserRaw?.user) {
        console.error('BULK STAFF INVITE FAILED:', {
          error: createError?.message,
          company_id: staff.company_id,
        })
        skipped++
        continue
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('company_staff')
        .insert({
          company_id: staff.company_id,
          user_id: newUserRaw.user.id,
          role: member.role,
          status: 'invited',
          invited_by: user.id,
        })
      imported++
    }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.invited',
    entityLabel: `Bulk import — ${imported} staff invited`,
    metadata: { imported, skipped },
  })

  revalidatePath('/settings')
  return { success: true, data: { imported, skipped } }
}

// ── Add staff directly — no email invite ───────────────────────────────────
// Creates the account immediately with a system-generated temporary
// password and flags it so the person must set their own password the
// first time they log in. The temp password is returned once so the admin
// can hand it to them directly — it is never stored or emailed.

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12)
}

export async function createStaffDirect(
  formData: FormData
): Promise<ActionResult<{ tempPassword: string }>> {
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
    return { success: false, error: 'Only admins can add staff' }
  }

  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const fullName = formData.get('full_name') as string

  if (!email || !role) {
    return { success: false, error: 'Email and role are required' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUsersRaw } = await (adminClient as any)
    .auth.admin.listUsers()

  const existingUsers = existingUsersRaw?.users ?? []
  const existingUser = existingUsers.find(
    (u: { email: string }) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existingUser) {
    return {
      success: false,
      error: 'An account with this email already exists — use "Invite staff" instead',
    }
  }

  const tempPassword = generateTempPassword()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newUserRaw, error: createError } = await (adminClient as any)
    .auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName || email },
    })

  if (createError || !newUserRaw?.user) {
    console.error('STAFF DIRECT CREATE FAILED:', {
      error: createError?.message,
      company_id: staff.company_id,
    })
    return { success: false, error: 'Failed to create account. Please try again.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: staffInsertError } = await (adminClient as any)
    .from('company_staff')
    .insert({
      company_id: staff.company_id,
      user_id: newUserRaw.user.id,
      role,
      status: 'active',
      invited_by: user.id,
      must_change_password: true,
    })

  if (staffInsertError) {
    console.error('STAFF DIRECT INSERT FAILED:', {
      error: staffInsertError.message,
      company_id: staff.company_id,
    })
    return {
      success: false,
      error: 'Account created but could not be added to your company. Please contact support.',
    }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'staff.created',
    entityType: 'staff',
    entityLabel: email,
    metadata: { role, full_name: fullName || null },
  })

  revalidatePath('/settings')
  return { success: true, data: { tempPassword } }
}