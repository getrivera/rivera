'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { createVirtualAccount } from '@/lib/paystack-va'
import { getCompanyPaystackKey } from '@/lib/paystack-company'
import { VA_DEMO_MODE } from '@/lib/va-demo'

type StaffRecord = { company_id: string; role: string }

export async function createBuyerVirtualAccount(
  buyerId: string,
  preferredBank: 'wema-bank' | 'titan-paystack' = 'wema-bank'
): Promise<ActionResult> {
  const adminClient = createAdminClient()

  if (VA_DEMO_MODE) {
    return { success: false, error: 'VA creation is disabled in demo mode.' }
  }

  // Check if company has Paystack configured
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buyerRaw } = await (adminClient as any)
    .from('buyers')
    .select('id, full_name, phone, email, company_id')
    .eq('id', buyerId)
    .single()

  const buyer = buyerRaw as {
    id: string
    full_name: string
    phone: string
    email: string | null
    company_id: string
  } | null

  if (!buyer) return { success: false, error: 'Buyer not found' }

  const paystackConfig = await getCompanyPaystackKey(buyer.company_id)
  if (!paystackConfig) {
    return {
      success: false,
      error: 'Paystack is not configured. Please connect your Paystack account in Settings → Payments.',
    }
  }

  // Check if VA already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRaw } = await (adminClient as any)
    .from('virtual_accounts')
    .select('id, account_number, bank_name, account_name')
    .eq('buyer_id', buyerId)
    .eq('is_active', true)
    .single()

  if (existingRaw) {
    return { success: true, data: existingRaw }
  }

  // Split full name
  const nameParts = buyer.full_name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  // Use a Rivera-managed email if buyer has none
  const email = buyer.email ?? `${buyerId}@buyers.rivera.ng`

  const va = await createVirtualAccount({
    email,
    firstName,
    lastName,
    phone: buyer.phone,
    preferredBank,
    secretKey: paystackConfig.secret_key,
    metadata: {
      buyer_id: buyerId,
      company_id: buyer.company_id,
      key_source: paystackConfig.source,
    },
  })

  if (!va) {
    return { success: false, error: 'Failed to create virtual account. Please try again.' }
  }

  // Store VA
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vaRaw, error } = await (adminClient as any)
    .from('virtual_accounts')
    .insert({
      company_id: buyer.company_id,
      buyer_id: buyerId,
      paystack_account_id: va.paystackAccountId,
      account_number: va.accountNumber,
      account_name: va.accountName,
      bank_name: va.bankName,
      bank_slug: va.bankSlug,
      is_active: true,
    })
    .select('id, account_number, account_name, bank_name')
    .single()

  if (error || !vaRaw) {
    console.error('VA INSERT FAILED:', error?.message)
    return { success: false, error: 'Failed to save virtual account.' }
  }

  revalidatePath(`/sales/${buyerId}`)
  revalidatePath('/virtual-accounts')
  return { success: true, data: vaRaw }
}

export async function getBuyerVirtualAccount(buyerId: string) {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any)
    .from('virtual_accounts')
    .select('id, account_number, account_name, bank_name, bank_slug, is_active, created_at')
    .eq('buyer_id', buyerId)
    .eq('is_active', true)
    .single()

  return data
}

export async function getVATransactions(buyerId: string) {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vaRaw } = await (adminClient as any)
    .from('virtual_accounts')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('is_active', true)
    .single()

  if (!vaRaw) return []
  const va = vaRaw as { id: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any)
    .from('va_transactions')
    .select('id, amount_kobo, narration, paystack_reference, paid_at, created_at')
    .eq('virtual_account_id', va.id)
    .order('paid_at', { ascending: false })

  return data ?? []
}