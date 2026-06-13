import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnerProfileForm } from './partner-profile-form'
import { formatDate } from '@/lib/utils'

export default async function PartnerProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id, full_name, email, phone, bank_name, bank_account_number, bank_account_name')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) redirect('/partner/login')

  type Partner = {
    id: string
    full_name: string
    email: string
    phone: string
    bank_name: string | null
    bank_account_number: string | null
    bank_account_name: string | null
  }

  const partner = partnerRaw as Partner

  // Fetch companies
  const { data: companiesRaw } = await supabase
    .from('partner_companies')
    .select(`
      company_id, status, join_method, created_at,
      companies ( name, logo_url, brand_colour )
    `)
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: true })

  type CompanyLink = {
    company_id: string
    status: string
    join_method: string
    created_at: string
    companies: {
      name: string
      logo_url: string | null
      brand_colour: string | null
    } | null
  }

  const companies = (companiesRaw ?? []) as CompanyLink[]

  const multiCompanyEnabled = process.env.NEXT_PUBLIC_PARTNER_MULTI_COMPANY === 'true'

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Update your details and bank account for commission payouts
        </p>
      </div>

      <PartnerProfileForm partner={partner} />

      {/* My companies */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">My companies</h2>
          {multiCompanyEnabled && (
            <a
              href="/partner/join"
              className="text-xs text-brand-500 hover:underline"
            >
              + Join another
            </a>
          )}
        </div>

        {companies.length === 0 ? (
          <p className="text-sm text-gray-400">No companies linked yet.</p>
        ) : (
          <div className="space-y-2">
            {companies.map((c) => (
              <div
                key={c.company_id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden">
                  {c.companies?.logo_url ? (
                    <img
                      src={c.companies.logo_url}
                      alt={c.companies.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: c.companies?.brand_colour ?? '#1B4F72' }}
                    >
                      {c.companies?.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {c.companies?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {c.status} · Joined {formatDate(c.created_at)}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${
                    c.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : c.status === 'suspended'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}