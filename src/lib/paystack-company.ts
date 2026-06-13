import { createAdminClient } from '@/lib/supabase/admin'

export const VA_ENABLED = process.env.PAYSTACK_VA_ENABLED === 'true'

type PaystackConfig = {
  secret_key: string
  source: 'company' | 'rivera'
}

// Get the correct Paystack secret key for a company
// Priority: company's own key → Rivera's key → null
export async function getCompanyPaystackKey(
  companyId: string
): Promise<PaystackConfig | null> {
  const adminClient = createAdminClient()

  // Check if company has their own Paystack config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: configRaw } = await (adminClient as any)
    .from('company_paystack_config')
    .select('paystack_secret_key, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  const config = configRaw as {
    paystack_secret_key: string
    is_active: boolean
  } | null

  if (config?.paystack_secret_key) {
    return {
      secret_key: config.paystack_secret_key,
      source: 'company',
    }
  }

  // Fall back to Rivera's key
  const riveraKey = process.env.PAYSTACK_SECRET_KEY
  if (riveraKey && VA_ENABLED) {
    return {
      secret_key: riveraKey,
      source: 'rivera',
    }
  }

  return null
}

// Check if a company has their own Paystack config
export async function hasCompanyPaystackConfig(
  companyId: string
): Promise<boolean> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any)
    .from('company_paystack_config')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  return !!data
}