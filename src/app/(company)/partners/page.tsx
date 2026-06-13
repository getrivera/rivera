import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnersClient } from './partners-client'
import { InvitePartnerModal } from './invite-partner-modal'
import { ImportPartnersModal } from './import-partners-modal'

type StaffRecord = { company_id: string; role: string }

type PartnerCompanyRow = {
  id: string
  status: string
  join_method: string
  created_at: string
  partner_id: string | null
  invited_email: string | null
  invited_name: string | null
  partners: {
    id: string
    full_name: string
    email: string
    phone: string
    photo_url: string | null
  } | null
}

export type PartnerRow = {
  partner_company_id: string
  partner_id: string
  full_name: string
  email: string
  phone: string
  photo_url: string | null
  status: string
  join_method: string
  joined_at: string
  buyer_count: number
  commission_paid_kobo: number
}

export default async function PartnersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as StaffRecord

  // Company code, partner links, buyer counts and commission totals are all
  // independent — fetch them in parallel instead of four sequential trips.
  const [companyRes, partnerCompaniesRes, buyerCountsRes, commissionsRes] = await Promise.all([
    supabase
      .from('companies')
      .select('company_code')
      .eq('id', staff.company_id)
      .single(),
    supabase
      .from('partner_companies')
      .select(
        `
        id,
        status,
        join_method,
        created_at,
        partner_id,
        invited_email,
        invited_name,
        partners (
          id,
          full_name,
          email,
          phone,
          photo_url
        )
      `
      )
      .eq('company_id', staff.company_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('buyers')
      .select('partner_id')
      .eq('company_id', staff.company_id)
      .not('partner_id', 'is', null),
    supabase
      .from('commissions')
      .select('partner_id, amount_kobo, status')
      .eq('company_id', staff.company_id)
      .eq('status', 'paid'),
  ])

  const company = companyRes.data as { company_code: string } | null
  const companyCode = company?.company_code ?? ''
  const partnerCompaniesRaw = partnerCompaniesRes.data

  const typedPartnerCompanies = (partnerCompaniesRaw ?? []) as unknown as PartnerCompanyRow[]

  const buyerCounts = (buyerCountsRes.data ?? []) as { partner_id: string }[]

  const commissions = (commissionsRes.data ?? []) as {
    partner_id: string
    amount_kobo: number
    status: string
  }[]

  // Build partner rows
  const partnerRows: PartnerRow[] = typedPartnerCompanies.map((pc) => {
    const partner = pc.partners
    const buyerCount = buyerCounts.filter(
      (b) => b.partner_id === pc.partner_id
    ).length
    const commissionPaid = commissions
      .filter((c) => c.partner_id === pc.partner_id)
      .reduce((sum, c) => sum + (c.amount_kobo ?? 0), 0)

    return {
      partner_company_id: pc.id,
      partner_id: pc.partner_id ?? '',
      full_name: partner?.full_name ?? pc.invited_name ?? pc.invited_email ?? 'Pending',
      email: partner?.email ?? pc.invited_email ?? '',
      phone: partner?.phone ?? '',
      photo_url: partner?.photo_url ?? null,
      status: pc.status,
      join_method: pc.join_method,
      joined_at: pc.created_at,
      buyer_count: buyerCount,
      commission_paid_kobo: commissionPaid,
    }
  })

  const canManage = ['admin', 'manager'].includes(staff.role)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {partnerRows.length} partner{partnerRows.length !== 1 ? 's' : ''} in
            your network
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <ImportPartnersModal />
            <InvitePartnerModal companyCode={companyCode} />
          </div>
        )}
      </div>

      <PartnersClient partners={partnerRows} canManage={canManage} />
    </div>
  )
}