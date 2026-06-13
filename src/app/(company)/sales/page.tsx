import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SalesClient } from './sales-client'
import Link from 'next/link'
import { Plus } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

export type SaleRow = {
  id: string
  full_name: string
  phone: string
  email: string | null
  listing_title: string
  listing_id: string
  source: string
  partner_name: string | null
  partner_id: string | null
  partner_company_id: string | null
  status: string
  registered_at: string
}

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as StaffRecord

  const { data: salesRaw } = await supabase
    .from('buyers')
    .select(`
      id,
      full_name,
      phone,
      email,
      source,
      status,
      created_at,
      listing_id,
      partner_id,
      referring_partner_company_id,
      listings ( title ),
      partners ( full_name )
    `)
    .eq('company_id', staff.company_id)
    .order('created_at', { ascending: false })
    .limit(500)

  type SaleRaw = {
    id: string
    full_name: string
    phone: string
    email: string | null
    source: string
    status: string
    created_at: string
    listing_id: string
    partner_id: string | null
    referring_partner_company_id: string | null
    listings: { title: string } | null
    partners: { full_name: string } | null
  }

  const sales = (salesRaw ?? []) as SaleRaw[]

  // Fetch partner_companies IDs for partner_id based links
  const partnerIds = Array.from(new Set(
    sales.map((s) => s.partner_id).filter(Boolean) as string[]
  ))

  const partnerCompanyMap: Record<string, string> = {}

  if (partnerIds.length > 0) {
    const { data: pcRaw } = await supabase
      .from('partner_companies')
      .select('id, partner_id')
      .in('partner_id', partnerIds)
      .eq('company_id', staff.company_id)

    const pcRows = (pcRaw ?? []) as { id: string; partner_id: string }[]
    pcRows.forEach((pc) => {
      partnerCompanyMap[pc.partner_id] = pc.id
    })
  }

  // Fetch partner names for sales where partner_id is null
  // but referring_partner_company_id is set (invited but not signed up yet)
  const referringPCIds = Array.from(new Set(
    sales
      .filter((s) => !s.partner_id && s.referring_partner_company_id)
      .map((s) => s.referring_partner_company_id) as string[]
  ))

  const referringPartnerNameMap: Record<string, string> = {}

  if (referringPCIds.length > 0) {
    const { data: referringRaw } = await supabase
      .from('partner_companies')
      .select('id, invited_name, invited_email, partner_id, partners ( full_name )')
      .in('id', referringPCIds)

    type ReferringRow = {
      id: string
      invited_name: string | null
      invited_email: string | null
      partner_id: string | null
      partners: { full_name: string } | null
    }

    const referringRows = (referringRaw ?? []) as ReferringRow[]
    referringRows.forEach((r) => {
      referringPartnerNameMap[r.id] =
        r.partners?.full_name ?? r.invited_name ?? r.invited_email ?? 'Unknown partner'
    })
  }

  const saleRows: SaleRow[] = sales.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    phone: s.phone,
    email: s.email,
    listing_title: s.listings?.title ?? 'Unknown listing',
    listing_id: s.listing_id,
    source: s.source,
    partner_name: s.partners?.full_name
      ?? (s.referring_partner_company_id
        ? (referringPartnerNameMap[s.referring_partner_company_id] ?? null)
        : null),
    partner_id: s.partner_id,
    partner_company_id: s.partner_id
      ? (partnerCompanyMap[s.partner_id] ?? null)
      : (s.referring_partner_company_id ?? null),
    status: s.status,
    registered_at: s.created_at,
  }))

  const canManage = ['admin', 'manager'].includes(staff.role)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {saleRows.length} sale{saleRows.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        {canManage && (
          <Link
            href="/sales/new"
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Register sale
          </Link>
        )}
      </div>

      <SalesClient sales={saleRows} canManage={canManage} />
    </div>
  )
}