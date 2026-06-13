'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types'
import { createCommission } from './commissions'

export async function partnerRegisterSale(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) return { success: false, error: 'Partner not found' }
  const partner = partnerRaw as { id: string }

  const listingId = formData.get('listing_id') as string
  const installmentPlanId = (formData.get('installment_plan_id') as string) || null
  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const notes = formData.get('notes') as string
  const unitQuantity = parseInt(formData.get('unit_quantity') as string) || 1

  if (!fullName || !phone || !listingId) {
    return { success: false, error: 'Full name, phone and listing are required' }
  }

  if (isNaN(unitQuantity) || unitQuantity < 1) {
    return { success: false, error: 'Unit quantity must be at least 1' }
  }

  // Verify partner has access to this listing's company
  const { data: listingRaw } = await supabase
    .from('listings')
    .select('company_id')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  const listing = listingRaw as { company_id: string } | null
  if (!listing) return { success: false, error: 'Listing not found or not active' }

  // Verify partner belongs to this company
  const { data: pcRaw } = await supabase
    .from('partner_companies')
    .select('id')
    .eq('partner_id', partner.id)
    .eq('company_id', listing.company_id)
    .eq('status', 'active')
    .single()

  if (!pcRaw) return { success: false, error: 'You are not authorised to register buyers for this listing' }

  // Verify the chosen installment plan belongs to the chosen listing
  if (installmentPlanId) {
    const { data: planCheckRaw } = await supabase
      .from('installment_plans')
      .select('id')
      .eq('id', installmentPlanId)
      .eq('listing_id', listingId)
      .single()

    if (!planCheckRaw) {
      return { success: false, error: 'The selected payment plan does not belong to this listing' }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saleRaw, error } = await (adminClient as any)
    .from('buyers')
    .insert({
      company_id: listing.company_id,
      partner_id: partner.id,
      listing_id: listingId,
      installment_plan_id: installmentPlanId,
      source: 'partner',
      registered_by: user.id,
      full_name: fullName,
      phone,
      email: email || null,
      notes: notes || null,
      status: 'pending_deposit',
      unit_quantity: unitQuantity,
    })
    .select('id')
    .single()

  if (error || !saleRaw) {
    console.error('PARTNER SALE INSERT FAILED:', error?.message)
    return { success: false, error: 'Failed to register buyer. Please try again.' }
  }

  const sale = saleRaw as { id: string }

  await createCommission(sale.id, listing.company_id)

  return { success: true, data: { saleId: sale.id } }
}