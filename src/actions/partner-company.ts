'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'

const COOKIE_NAME = 'rivera_partner_company'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const MULTI_COMPANY_ENABLED = process.env.NEXT_PUBLIC_PARTNER_MULTI_COMPANY === 'true'

export async function setActiveCompany(companyId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, companyId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  redirect('/partner/dashboard')
}

export async function getActiveCompanyId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function joinCompanyWithCode(companyCode: string): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) return { success: false, error: 'Partner profile not found' }
  const partner = partnerRaw as { id: string }

  // When multi-company is disabled, a partner may still join their FIRST
  // company (otherwise invite links are a dead end for partners who signed
  // up without a code). Only joining an additional company is gated.
  if (!MULTI_COMPANY_ENABLED) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (adminClient as any)
      .from('partner_companies')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner.id)
      .eq('status', 'active')

    if ((count ?? 0) > 0) {
      return { success: false, error: 'Joining multiple companies is not enabled.' }
    }
  }

  // Find company by code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('id, name')
    .eq('company_code', companyCode.toUpperCase().trim())
    .single()

  const company = companyRaw as { id: string; name: string } | null
  if (!company) return { success: false, error: 'Invalid company code. Please check and try again.' }

  // Check if already linked
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRaw } = await (adminClient as any)
    .from('partner_companies')
    .select('id, status')
    .eq('partner_id', partner.id)
    .eq('company_id', company.id)
    .single()

  const existing = existingRaw as { id: string; status: string } | null

  if (existing) {
    if (existing.status === 'active') {
      return { success: false, error: 'You are already part of this company.' }
    }
    if (existing.status === 'suspended') {
      return { success: false, error: 'Your access to this company has been suspended.' }
    }
    if (existing.status === 'removed') {
      return { success: false, error: 'You have been removed from this company.' }
    }
    // status === 'invited' — they were invited by email and are now joining
    // with the code. Activate the existing link instead of inserting a
    // duplicate row (which previously violated nothing but left two links).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: activateError } = await (adminClient as any)
      .from('partner_companies')
      .update({ status: 'active', join_method: 'code' })
      .eq('id', existing.id)

    if (activateError) {
      console.error('JOIN COMPANY ACTIVATE FAILED:', activateError.message)
      return { success: false, error: 'Failed to join company. Please try again.' }
    }

    return { success: true, data: { companyName: company.name, companyId: company.id } }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('partner_companies')
    .insert({
      partner_id: partner.id,
      company_id: company.id,
      status: 'active',
      join_method: 'code',
      invited_email: user.email,
    })

  if (error) {
    console.error('JOIN COMPANY FAILED:', error.message)
    return { success: false, error: 'Failed to join company. Please try again.' }
  }

  return { success: true, data: { companyName: company.name, companyId: company.id } }
}