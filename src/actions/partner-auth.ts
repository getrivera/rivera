'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'

// ── Link partner to company after client-side signup ──────────────────────

export async function linkPartnerToCompany({
  userId,
  email,
  fullName,
  phone,
  companyCode,
}: {
  userId: string
  email: string
  fullName: string
  phone: string
  companyCode: string
}): Promise<ActionResult> {
  const adminClient = createAdminClient()

  // Verify company code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('id, name')
    .eq('company_code', companyCode)
    .single()

  const company = companyRaw as { id: string; name: string } | null
  if (!company) {
    return { success: false, error: 'Invalid company code. Please check with your company.' }
  }

  // Create partner profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: partnerRaw, error: partnerError } = await (adminClient as any)
    .from('partners')
    .insert({
      user_id: userId,
      full_name: fullName,
      email,
      phone,
    })
    .select('id')
    .single()

  if (partnerError || !partnerRaw) {
    console.error('PARTNER PROFILE CREATE FAILED:', partnerError?.message)
    return { success: false, error: 'Failed to create partner profile' }
  }

  const partner = partnerRaw as { id: string }

  // Backfill any pending invites
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendingInvitesRaw } = await (adminClient as any)
    .from('partner_companies')
    .select('id, company_id')
    .eq('invited_email', email.toLowerCase())
    .is('partner_id', null)

  const pendingInvites = (pendingInvitesRaw ?? []) as { id: string; company_id: string }[]

  for (const invite of pendingInvites) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('partner_companies')
      .update({ partner_id: partner.id, status: 'active' })
      .eq('id', invite.id)

    // Backfill buyers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('buyers')
      .update({ partner_id: partner.id })
      .eq('referring_partner_company_id', invite.id)
      .is('partner_id', null)

    // Create held commissions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: heldSalesRaw } = await (adminClient as any)
      .from('buyers')
      .select('id, listing_id, source')
      .eq('referring_partner_company_id', invite.id)
      .eq('source', 'partner')

    const heldSales = (heldSalesRaw ?? []) as { id: string; listing_id: string; source: string }[]

    for (const sale of heldSales) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingRaw } = await (adminClient as any)
        .from('commissions')
        .select('id')
        .eq('buyer_id', sale.id)
        .single()

      if (existingRaw) continue

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

      if (!listing) continue

      const amountKobo = listing.commission_type === 'fixed'
        ? listing.commission_value
        : Math.round((listing.commission_value / 100) * listing.price_kobo)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('commissions')
        .insert({
          company_id: invite.company_id,
          partner_id: partner.id,
          buyer_id: sale.id,
          listing_id: sale.listing_id,
          amount_kobo: amountKobo,
          trigger_event: listing.commission_trigger,
          status: 'pending',
        })
    }
  }

  // Link to company via code if not already linked
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingLinkRaw } = await (adminClient as any)
    .from('partner_companies')
    .select('id')
    .eq('company_id', company.id)
    .eq('partner_id', partner.id)
    .single()

  if (!existingLinkRaw) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('partner_companies')
      .insert({
        company_id: company.id,
        partner_id: partner.id,
        status: 'active',
        join_method: 'code',
        invited_email: email,
      })
  }

  return { success: true, data: { companyName: company.name } }
}

// ── Partner login ─────────────────────────────────────────────────────────

export async function partnerLogin(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { success: false, error: 'Invalid email or password' }
  }

  redirect('/partner/dashboard')
}

// ── Partner logout ────────────────────────────────────────────────────────

export async function partnerLogout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/partner/login')
}