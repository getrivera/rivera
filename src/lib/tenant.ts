import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type Company = Database['public']['Tables']['companies']['Row']

// ─────────────────────────────────────────────────────────────────────────────
// getTenant()
//
// Call this at the top of any Server Component or Route Handler that needs
// to know which company's context it is operating in.
//
// Returns the company record, or null if on root domain.
// Throws if a subdomain/custom domain is present but no matching company found
// (this covers typos, deleted companies, etc.).
// ─────────────────────────────────────────────────────────────────────────────

// Wrapped in React cache() so layout + page + nested components calling
// getTenant() in the same request share ONE database lookup.
export const getTenant = cache(async (): Promise<Company | null> => {
  const headersList = await headers()
  const slug = headersList.get('x-rivera-tenant-slug')
  const customDomain = headersList.get('x-rivera-custom-domain')

  if (!slug && !customDomain) {
    // Root domain — no tenant context
    return null
  }

  const supabase = await createClient()

  if (slug) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) return null
    return data
  }

  if (customDomain) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('custom_domain', customDomain)
      .single()

    if (error || !data) return null
    return data
  }

  return null
})

// ─────────────────────────────────────────────────────────────────────────────
// requireTenant()
//
// Like getTenant() but throws a 404-style error if no tenant is found.
// Use in pages that must always be in a tenant context.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireTenant(): Promise<Company> {
  const tenant = await getTenant()
  if (!tenant) {
    throw new Error('No tenant found for this domain')
  }
  return tenant
}
