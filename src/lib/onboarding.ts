import { createClient } from '@/lib/supabase/server'
import type { CompanyOnboarding } from '@/types/supabase'

export async function getOnboardingProgress(
  companyId: string
): Promise<CompanyOnboarding | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('company_onboarding')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error || !data) return null
  return data
}