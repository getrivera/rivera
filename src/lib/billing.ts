import { createAdminClient } from '@/lib/supabase/admin'

export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true'

// ── Plan limits ────────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<string, {
  maxStaff: number
  maxListings: number
  maxPartners: number
  storageGb: number
  freeEmailsMonthly: number
}> = {
  starter: {
    maxStaff: 5,
    maxListings: 10,
    maxPartners: 25,
    storageGb: 2,
    freeEmailsMonthly: 1000,
  },
  scale: {
    maxStaff: 25,
    maxListings: 100,
    maxPartners: 500,
    storageGb: 20,
    freeEmailsMonthly: 5000,
  },
}

// ── Add-on pricing ─────────────────────────────────────────────────────────

export const ADDON_PRICING = {
  cac: {
    priceKobo: parseInt(process.env.ADDON_CAC_PRICE_KOBO ?? '50000'),
  },
  sms: {
    blockSize: parseInt(process.env.ADDON_SMS_BLOCK_SIZE ?? '1000'),
    blockPriceKobo: parseInt(process.env.ADDON_SMS_BLOCK_PRICE_KOBO ?? '150000'),
  },
  email: {
    freeMonthly: parseInt(process.env.ADDON_EMAIL_FREE_MONTHLY ?? '1000'),
    blockSize: parseInt(process.env.ADDON_EMAIL_BLOCK_SIZE ?? '1000'),
    blockPriceKobo: parseInt(process.env.ADDON_EMAIL_BLOCK_PRICE_KOBO ?? '50000'),
  },
  storage: {
    freeGb: parseInt(process.env.ADDON_STORAGE_FREE_GB ?? '5'),
    blockGb: parseInt(process.env.ADDON_STORAGE_BLOCK_GB ?? '10'),
    blockPriceKobo: parseInt(process.env.ADDON_STORAGE_BLOCK_PRICE_KOBO ?? '200000'),
  },
}

// ── Current month helper ───────────────────────────────────────────────────

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

// ── Get or create usage record for current month ───────────────────────────

export async function getOrCreateUsage(companyId: string) {
  const adminClient = createAdminClient()
  const month = currentMonth()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (adminClient as any)
    .from('company_usage')
    .select('*')
    .eq('company_id', companyId)
    .eq('month', month)
    .single()

  if (existing) return existing

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created } = await (adminClient as any)
    .from('company_usage')
    .insert({ company_id: companyId, month })
    .select()
    .single()

  return created
}

// ── Increment usage ────────────────────────────────────────────────────────

export async function incrementUsage(
  companyId: string,
  field: 'cac_verifications' | 'sms_sent' | 'emails_sent',
  amount = 1
): Promise<void> {
  if (!BILLING_ENABLED) return

  try {
    const adminClient = createAdminClient()
    const month = currentMonth()

    // Upsert usage record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_usage')
      .upsert(
        { company_id: companyId, month, [field]: amount },
        {
          onConflict: 'company_id,month',
          ignoreDuplicates: false,
        }
      )

    // Then increment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any).rpc('increment_usage', {
      p_company_id: companyId,
      p_month: month,
      p_field: field,
      p_amount: amount,
    })
  } catch (err) {
    console.error('INCREMENT USAGE FAILED:', err)
  }
}

export async function updateStorageUsage(
  companyId: string,
  bytes: number
): Promise<void> {
  if (!BILLING_ENABLED) return

  try {
    const adminClient = createAdminClient()
    const month = currentMonth()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_usage')
      .upsert(
        { company_id: companyId, month, storage_bytes_used: bytes },
        { onConflict: 'company_id,month', ignoreDuplicates: false }
      )
  } catch (err) {
    console.error('UPDATE STORAGE USAGE FAILED:', err)
  }
}

// ── Calculate add-on charges for a month ──────────────────────────────────

export type AddonChargeCalc = {
  type: 'cac' | 'sms' | 'email' | 'storage'
  unitsUsed: number
  unitsBilled: number
  unitPriceKobo: number
  totalKobo: number
}

export function calculateAddonCharges(usage: {
  cac_verifications: number
  sms_sent: number
  emails_sent: number
  storage_bytes_used: number
}): AddonChargeCalc[] {
  const charges: AddonChargeCalc[] = []

  // CAC — per verification
  if (usage.cac_verifications > 0) {
    charges.push({
      type: 'cac',
      unitsUsed: usage.cac_verifications,
      unitsBilled: usage.cac_verifications,
      unitPriceKobo: ADDON_PRICING.cac.priceKobo,
      totalKobo: usage.cac_verifications * ADDON_PRICING.cac.priceKobo,
    })
  }

  // SMS — billed in blocks of 1000
  if (usage.sms_sent > 0) {
    const blocks = Math.ceil(usage.sms_sent / ADDON_PRICING.sms.blockSize)
    const unitsBilled = blocks * ADDON_PRICING.sms.blockSize
    charges.push({
      type: 'sms',
      unitsUsed: usage.sms_sent,
      unitsBilled,
      unitPriceKobo: ADDON_PRICING.sms.blockPriceKobo / ADDON_PRICING.sms.blockSize,
      totalKobo: blocks * ADDON_PRICING.sms.blockPriceKobo,
    })
  }

  // Email — first N free, then billed in blocks
  const billableEmails = Math.max(0, usage.emails_sent - ADDON_PRICING.email.freeMonthly)
  if (billableEmails > 0) {
    const blocks = Math.ceil(billableEmails / ADDON_PRICING.email.blockSize)
    const unitsBilled = blocks * ADDON_PRICING.email.blockSize
    charges.push({
      type: 'email',
      unitsUsed: usage.emails_sent,
      unitsBilled,
      unitPriceKobo: ADDON_PRICING.email.blockPriceKobo / ADDON_PRICING.email.blockSize,
      totalKobo: blocks * ADDON_PRICING.email.blockPriceKobo,
    })
  }

  // Storage — free up to N GB, then billed in blocks
  const usedGb = usage.storage_bytes_used / (1024 * 1024 * 1024)
  const billableGb = Math.max(0, usedGb - ADDON_PRICING.storage.freeGb)
  if (billableGb > 0) {
    const blocks = Math.ceil(billableGb / ADDON_PRICING.storage.blockGb)
    charges.push({
      type: 'storage',
      unitsUsed: Math.round(usedGb * 100) / 100,
      unitsBilled: blocks * ADDON_PRICING.storage.blockGb,
      unitPriceKobo: ADDON_PRICING.storage.blockPriceKobo / ADDON_PRICING.storage.blockGb,
      totalKobo: blocks * ADDON_PRICING.storage.blockPriceKobo,
    })
  }

  return charges
}

// ── Check if company subscription is active ───────────────────────────────

export async function getSubscriptionStatus(companyId: string): Promise<{
  status: string
  planSlug: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  gracePeriodEndsAt: string | null
  daysRemaining: number | null
}> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any)
    .from('company_subscriptions')
    .select('status, plan_slug, trial_ends_at, current_period_end, grace_period_ends_at')
    .eq('company_id', companyId)
    .single()

  if (!data) {
    return {
      status: 'trialing',
      planSlug: 'starter',
      trialEndsAt: null,
      currentPeriodEnd: null,
      gracePeriodEndsAt: null,
      daysRemaining: null,
    }
  }

  const now = new Date()
  let daysRemaining: number | null = null

  if (data.status === 'trialing' && data.trial_ends_at) {
    daysRemaining = Math.max(
      0,
      Math.ceil((new Date(data.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
  } else if (data.status === 'past_due' && data.grace_period_ends_at) {
    daysRemaining = Math.max(
      0,
      Math.ceil((new Date(data.grace_period_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
  }

  return {
    status: data.status,
    planSlug: data.plan_slug,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    gracePeriodEndsAt: data.grace_period_ends_at,
    daysRemaining,
  }
}