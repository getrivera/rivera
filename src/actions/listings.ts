'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'
import { can, type StaffRole } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { parseNumberInput } from '@/lib/utils'

type StaffRecord = { company_id: string; role: string }

// ── Create listing ────────────────────────────────────────────────────────

export async function createListing(formData: FormData): Promise<ActionResult> {
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

  if (!can.manageListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to create listings' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const propertyType = formData.get('property_type') as string
  const locationState = formData.get('location_state') as string
  const locationCity = formData.get('location_city') as string
  const locationAddress = formData.get('location_address') as string
  const priceNaira = formData.get('price_naira') as string
  const unitType = formData.get('unit_type') as string
  const unitsTotal = formData.get('units_total') as string
  const commissionType = formData.get('commission_type') as string
  const commissionValue = formData.get('commission_value') as string
  const commissionTrigger = formData.get('commission_trigger') as string
  const commissionClawback = formData.get('commission_clawback') === 'true'
  const showUnitsToParters = formData.get('show_units_to_partners') === 'true'

  if (!title || !propertyType || !locationState || !locationCity || !priceNaira || !unitType || !unitsTotal) {
    return { success: false, error: 'Please fill in all required fields' }
  }

  // parseNumberInput strips commas/₦ — parseFloat("5,000,000") would be 5
  const priceKobo = Math.round(parseNumberInput(priceNaira) * 100)
  if (isNaN(priceKobo) || priceKobo <= 0) {
    return { success: false, error: 'Please enter a valid price' }
  }

  const unitsTotalNum = parseNumberInput(unitsTotal)
  if (isNaN(unitsTotalNum) || unitsTotalNum <= 0) {
    return { success: false, error: 'Please enter a valid number of units' }
  }

  const commissionValueNum = parseNumberInput(commissionValue)
  if (isNaN(commissionValueNum) || commissionValueNum <= 0) {
    return { success: false, error: 'Please enter a valid commission value' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing, error } = await (adminClient as any)
    .from('listings')
    .insert({
      company_id: staff.company_id,
      title,
      description: description || null,
      property_type: propertyType,
      location_state: locationState,
      location_city: locationCity,
      location_address: locationAddress || null,
      price_kobo: priceKobo,
      unit_type: unitType,
      units_total: unitsTotalNum,
      commission_type: commissionType,
      commission_value: commissionType === 'fixed' ? Math.round(commissionValueNum * 100) : commissionValueNum,
      commission_trigger: commissionTrigger,
      commission_clawback: commissionClawback,
      show_units_to_partners: showUnitsToParters,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !listing) {
    return { success: false, error: 'Failed to create listing. Please try again.' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'listing.created',
    entityType: 'listing',
    entityId: listing.id,
    entityLabel: title,
    metadata: { location: `${locationCity}, ${locationState}` },
  })

  revalidatePath('/listings')
  redirect(`/listings/${listing.id}/plans`)
}

// ── Update listing ────────────────────────────────────────────────────────

export async function updateListing(
  listingId: string,
  formData: FormData
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

  if (!can.manageListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to edit listings' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const propertyType = formData.get('property_type') as string
  const locationState = formData.get('location_state') as string
  const locationCity = formData.get('location_city') as string
  const locationAddress = formData.get('location_address') as string
  const priceNaira = formData.get('price_naira') as string
  const unitType = formData.get('unit_type') as string
  const unitsTotal = formData.get('units_total') as string
  const commissionType = formData.get('commission_type') as string
  const commissionValue = formData.get('commission_value') as string
  const commissionTrigger = formData.get('commission_trigger') as string
  const commissionClawback = formData.get('commission_clawback') === 'true'
  const showUnitsToPartners = formData.get('show_units_to_partners') === 'true'

  // Validate numerics before writing (comma-safe)
  const updPriceKobo = Math.round(parseNumberInput(priceNaira) * 100)
  const updUnitsTotal = parseNumberInput(unitsTotal)
  const updCommissionValue = parseNumberInput(commissionValue)

  if (isNaN(updPriceKobo) || updPriceKobo <= 0) {
    return { success: false, error: 'Please enter a valid price' }
  }
  if (isNaN(updUnitsTotal) || updUnitsTotal <= 0) {
    return { success: false, error: 'Please enter a valid number of units' }
  }
  if (isNaN(updCommissionValue) || updCommissionValue <= 0) {
    return { success: false, error: 'Please enter a valid commission value' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('listings')
    .update({
      title,
      description: description || null,
      property_type: propertyType,
      location_state: locationState,
      location_city: locationCity,
      location_address: locationAddress || null,
      price_kobo: updPriceKobo,
      unit_type: unitType,
      units_total: updUnitsTotal,
      commission_type: commissionType,
      commission_value: commissionType === 'fixed'
        ? Math.round(updCommissionValue * 100)
        : updCommissionValue,
      commission_trigger: commissionTrigger,
      commission_clawback: commissionClawback,
      show_units_to_partners: showUnitsToPartners,
    })
    .eq('id', listingId)
    .eq('company_id', staff.company_id)

  if (error) {
    return { success: false, error: 'Failed to update listing.' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'listing.updated',
    entityType: 'listing',
    entityId: listingId,
    entityLabel: title,
  })

  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)
  return { success: true, data: undefined }
}

// ── Publish listing ───────────────────────────────────────────────────────

export async function publishListing(listingId: string): Promise<ActionResult> {
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

  if (!can.publishListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to publish listings' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('listings')
    .update({ status: 'active' })
    .eq('id', listingId)
    .eq('company_id', staff.company_id)

  if (error) {
    return { success: false, error: 'Failed to publish listing.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('company_onboarding')
    .update({ first_listing_created: true })
    .eq('company_id', staff.company_id)

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'listing.published',
    entityType: 'listing',
    entityId: listingId,
  })

  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

// ── Archive listing ───────────────────────────────────────────────────────

export async function archiveListing(listingId: string): Promise<ActionResult> {
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

  if (!can.publishListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to archive listings' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('listings')
    .update({ status: 'archived' })
    .eq('id', listingId)
    .eq('company_id', staff.company_id)

  if (error) {
    return { success: false, error: 'Failed to archive listing.' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'listing.archived',
    entityType: 'listing',
    entityId: listingId,
  })

  revalidatePath('/listings')
  return { success: true, data: undefined }
}

// ── Save installment plans ────────────────────────────────────────────────

export async function saveInstallmentPlans(
  listingId: string,
  formData: FormData
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

  if (!can.manageListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage installment plans' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('installment_plans')
    .delete()
    .eq('listing_id', listingId)
    .eq('company_id', staff.company_id)

  const planCount = parseInt(formData.get('plan_count') as string) || 0

  if (planCount === 0) {
    revalidatePath(`/listings/${listingId}`)
    redirect(`/listings/${listingId}/kit`)
  }

  const plans = []
  for (let i = 0; i < planCount; i++) {
    const name = formData.get(`plan_${i}_name`) as string
    const durationMonths = parseInt(formData.get(`plan_${i}_duration_months`) as string)
    const depositNaira = parseNumberInput(formData.get(`plan_${i}_deposit_naira`))
    const installmentCount = parseInt(formData.get(`plan_${i}_installment_count`) as string)
    const installmentNaira = parseNumberInput(formData.get(`plan_${i}_installment_naira`))
    const penaltyRate = parseNumberInput(formData.get(`plan_${i}_penalty_rate`)) || 0

    if (!name || isNaN(durationMonths) || isNaN(depositNaira) || isNaN(installmentCount) || isNaN(installmentNaira)) {
      return { success: false, error: `Plan ${i + 1} has missing or invalid fields` }
    }

    plans.push({
      listing_id: listingId,
      company_id: staff.company_id,
      name,
      duration_months: durationMonths,
      deposit_amount_kobo: Math.round(depositNaira * 100),
      installment_count: installmentCount,
      installment_amount_kobo: Math.round(installmentNaira * 100),
      penalty_rate: penaltyRate,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('installment_plans')
    .insert(plans)

  if (error) {
    return { success: false, error: 'Failed to save installment plans.' }
  }

  revalidatePath(`/listings/${listingId}`)
  redirect(`/listings/${listingId}/kit`)
}

// ── Save marketing kit & gallery ─────────────────────────────────────────

export async function saveMarketingKit(
  listingId: string,
  galleryUrls: string[],
  kitFiles: { file_name: string; file_type: string; storage_url: string; size_bytes: number }[]
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

  if (!can.manageListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to manage marketing kits' }
  }

  if (galleryUrls.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('listings')
      .update({ gallery_urls: galleryUrls })
      .eq('id', listingId)
      .eq('company_id', staff.company_id)
  }

  if (kitFiles.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('marketing_assets')
      .insert(
        kitFiles.map((f) => ({
          listing_id: listingId,
          company_id: staff.company_id,
          file_name: f.file_name,
          file_type: f.file_type,
          storage_url: f.storage_url,
          size_bytes: f.size_bytes,
        }))
      )
  }

  revalidatePath(`/listings/${listingId}`)
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

// ── Delete marketing asset ────────────────────────────────────────────────

export async function deleteMarketingAsset(assetId: string): Promise<ActionResult> {
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

  if (!can.manageListing(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to delete marketing assets' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('marketing_assets')
    .delete()
    .eq('id', assetId)
    .eq('company_id', staff.company_id)

    await logAudit({
        companyId: staff.company_id,
        performedBy: user.id,
        action: 'listing.updated',
        entityType: 'listing',
        entityId: assetId,
        entityLabel: 'Marketing asset deleted',
      })

  return { success: true, data: undefined }
}