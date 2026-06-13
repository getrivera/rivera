import type { CompanyOnboarding } from '@/types/supabase'

// Pure functions — no server imports, safe to use in Client Components

export function isOnboardingComplete(onboarding: CompanyOnboarding): boolean {
  return (
    onboarding.company_verified &&
    onboarding.branding_complete &&
    onboarding.first_listing_created &&
    onboarding.first_partner_invited
  )
}

export function completedStepsCount(onboarding: CompanyOnboarding): number {
  return [
    onboarding.company_verified,
    onboarding.branding_complete,
    onboarding.first_listing_created,
    onboarding.first_partner_invited,
  ].filter(Boolean).length
}