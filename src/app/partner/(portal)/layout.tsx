import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnerSidebar } from '@/components/partner/partner-sidebar'
import { getActiveCompanyId } from '@/actions/partner-company'

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id, full_name, email, phone, photo_url')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) redirect('/partner/login')

  const partner = partnerRaw as {
    id: string
    full_name: string
    email: string
    phone: string
    photo_url: string | null
  }

  const { data: companiesRaw } = await supabase
    .from('partner_companies')
    .select(`
      id,
      status,
      company_id,
      companies ( id, name, logo_url, brand_colour )
    `)
    .eq('partner_id', partner.id)
    .eq('status', 'active')

  type CompanyLink = {
    id: string
    status: string
    company_id: string
    companies: {
      id: string
      name: string
      logo_url: string | null
      brand_colour: string | null
    } | null
  }

  const companyLinks = (companiesRaw ?? []) as CompanyLink[]

  if (companyLinks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">No active companies</h1>
          <p className="text-gray-500 text-sm mb-4">
            You are not linked to any active company yet.
          </p>
          <a
            href="/partner/join"
            className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
          >
            Join a company
          </a>
        </div>
      </div>
    )
  }

  // Get active company from cookie — fall back to first if cookie is missing or stale
  const activeCompanyId = await getActiveCompanyId()
  const currentCompanyLink =
    companyLinks.find((cl) => cl.company_id === activeCompanyId) ?? companyLinks[0]

    const currentCompany = currentCompanyLink.companies

    if (!currentCompany) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to load company</h1>
            <p className="text-gray-500 text-sm mb-4">
              There was a problem loading your company details. Please try again.
            </p>
            <a
              href="/partner/login"
              className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
            >
              Back to login
            </a>
          </div>
        </div>
      )
    }

  const multiCompanyEnabled = process.env.NEXT_PUBLIC_PARTNER_MULTI_COMPANY === 'true'

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{
        '--partner-brand': currentCompany.brand_colour ?? '#1B4F72',
        '--partner-brand-light': `${currentCompany.brand_colour ?? '#1B4F72'}18`,
      } as React.CSSProperties}
    >
      <PartnerSidebar
        partnerName={partner.full_name}
        partnerEmail={partner.email}
        companyName={currentCompany.name}
        companyId={currentCompany.id}
        logoUrl={currentCompany.logo_url}
        brandColour={currentCompany.brand_colour}
        multiCompanyEnabled={multiCompanyEnabled}
        companies={companyLinks.map((cl) => ({
          id: cl.company_id,
          name: cl.companies?.name ?? '',
          logo_url: cl.companies?.logo_url ?? null,
          brand_colour: cl.companies?.brand_colour ?? null,
        }))}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}