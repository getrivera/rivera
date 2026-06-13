'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types'
import { logAudit } from '@/lib/audit'
import { incrementUsage } from '@/lib/billing'

type StaffRecord = { company_id: string; role: string }

type DojahCACResponse = {
  entity: {
    rcNumber: string
    companyName: string
    companyType: string
    registrationDate: string
    status: string
    branchAddress?: string
    headOfficeAddress?: string
    city?: string
    state?: string
  }
}

export async function verifyCACNumber(rcNumber: string): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can verify CAC registration' }
  }

  const appId = process.env.DOJAH_APP_ID
  const secretKey = process.env.DOJAH_SECRET_KEY

  if (!appId || !secretKey) {
    return { success: false, error: 'CAC verification is not configured yet. Please contact Rivera support.' }
  }

  // Clean RC number — strip non-alphanumeric
  const cleanRC = rcNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  if (!cleanRC) {
    return { success: false, error: 'Please enter a valid RC number' }
  }

  try {
    const response = await fetch(
      `https://api.dojah.io/api/v1/kyc/cac?rc_number=${cleanRC}`,
      {
        method: 'GET',
        headers: {
          'AppId': appId,
          'Authorization': secretKey,
          'Accept': 'application/json',
        },
      }
    )

    // Track usage on every API call — Dojah charges per call regardless of result
    await incrementUsage(staff.company_id, 'cac_verifications', 1)

    if (!response.ok) {
      const errData = await response.json() as { error?: string; message?: string }
      console.error('DOJAH CAC ERROR:', errData)

      if (response.status === 404) {
        return { success: false, error: 'RC number not found in CAC records. Please check and try again.' }
      }
      if (response.status === 401) {
        return { success: false, error: 'CAC verification service error. Please try again later.' }
      }

      return { success: false, error: 'Could not verify RC number. Please try again.' }
    }

    const data = await response.json() as DojahCACResponse
    const entity = data?.entity

    if (!entity || !entity.companyName) {
      return { success: false, error: 'No company found with this RC number.' }
    }

    // Store verification result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminClient as any)
      .from('companies')
      .update({
        cac_verified: true,
        cac_verified_at: new Date().toISOString(),
        cac_company_name: entity.companyName,
        cac_company_type: entity.companyType ?? null,
        cac_company_status: entity.status ?? null,
        cac_registration_date: entity.registrationDate ?? null,
      })
      .eq('id', staff.company_id)

    if (updateError) {
      console.error('CAC UPDATE FAILED:', updateError.message)
      return { success: false, error: 'Verification succeeded but failed to save. Please try again.' }
    }

    await logAudit({
      companyId: staff.company_id,
      performedBy: user.id,
      action: 'staff.role_changed',
      entityType: 'company',
      entityId: staff.company_id,
      entityLabel: `CAC verified: ${entity.companyName}`,
      metadata: {
        rc_number: cleanRC,
        company_name: entity.companyName,
        company_type: entity.companyType,
        status: entity.status,
      },
    })

    return {
      success: true,
      data: {
        companyName: entity.companyName,
        companyType: entity.companyType,
        status: entity.status,
        registrationDate: entity.registrationDate,
      },
    }
  } catch (err) {
    console.error('CAC VERIFICATION FAILED:', err)
    return { success: false, error: 'CAC verification service is unavailable. Please try again later.' }
  }
}