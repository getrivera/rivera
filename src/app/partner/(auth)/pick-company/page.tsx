import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompanyId } from '@/actions/partner-company'
import { PickCompanyClient } from './pick-company-client'

export default async function PickCompanyPage() {
  if (process.env.NEXT_PUBLIC_PARTNER_MULTI_COMPANY !== 'true') {
    redirect('/partner/dashboard')
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) redirect('/partner/login')
  const partner = partnerRaw as { id: string; full_name: string }

  const { data: companiesRaw } = await supabase
    .from('partner_companies')
    .select(`
      company_id,
      companies ( id, name, logo_url, brand_colour )
    `)
    .eq('partner_id', partner.id)
    .eq('status', 'active')

  type CompanyLink = {
    company_id: string
    companies: {
      id: string
      name: string
      logo_url: string | null
      brand_colour: string | null
    } | null
  }

  const companies = (companiesRaw ?? []) as CompanyLink[]

  if (companies.length === 0) redirect('/partner/join')

  if (companies.length === 1) {
    const activeId = await getActiveCompanyId()
    if (activeId !== companies[0].company_id) {
      redirect(`/partner/set-company?id=${companies[0].company_id}`)
    }
    redirect('/partner/dashboard')
  }

  // Check if there's already a valid active cookie
  const activeId = await getActiveCompanyId()
  const validCookie = companies.find((c) => c.company_id === activeId)
  if (validCookie) redirect('/partner/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Choose a company</h1>
          <p className="text-gray-500 text-sm mt-1">
            You belong to multiple companies. Which one would you like to open?
          </p>
        </div>

        <PickCompanyClient
          companies={companies.map((c) => ({
            id: c.company_id,
            name: c.companies?.name ?? '',
            logo_url: c.companies?.logo_url ?? null,
            brand_colour: c.companies?.brand_colour ?? null,
          }))}
        />
      </div>
    </div>
  )
}