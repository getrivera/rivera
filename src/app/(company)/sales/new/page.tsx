import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterSaleForm } from './register-sale-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

type Listing = {
  id: string
  title: string
  location_city: string
  location_state: string
  status: string
}

type InstallmentPlan = {
  id: string
  listing_id: string
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_amount_kobo: number
}

type Partner = {
  id: string           // partner_companies.id — always set
  partner_id: string | null  // partners.id — null if no account yet
  full_name: string
  email: string
}

type PartnerCompanyRaw = {
  id: string
  partner_id: string | null
  invited_name: string | null
  invited_email: string | null
  partners: { id: string; full_name: string; email: string } | null
}

export default async function NewSalePage() {
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

  if (!['admin', 'manager', 'coordinator', 'finance'].includes(staff.role)) redirect('/sales')

  // Fetch active listings
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('id, title, location_city, location_state, status')
    .eq('company_id', staff.company_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const listings = (listingsRaw ?? []) as Listing[]

  // Fetch installment plans for all active listings
  const { data: plansRaw } = await supabase
    .from('installment_plans')
    .select('id, listing_id, name, duration_months, deposit_amount_kobo, installment_amount_kobo')
    .eq('company_id', staff.company_id)

  const plans = (plansRaw ?? []) as InstallmentPlan[]

  // Fetch active partners — all active regardless of whether they have accounts
  const { data: partnerCompaniesRaw } = await supabase
    .from('partner_companies')
    .select(`
      id,
      partner_id,
      invited_name,
      invited_email,
      partners ( id, full_name, email )
    `)
    .eq('company_id', staff.company_id)
    .eq('status', 'active')

  const partnerCompanies = (partnerCompaniesRaw ?? []) as PartnerCompanyRaw[]

  // Include all active partners — those without accounts show as (pending signup)
  const partners: Partner[] = partnerCompanies
    .filter((pc) => pc.partners !== null || pc.invited_name || pc.invited_email)
    .map((pc) => ({
      id: pc.id,                           // partner_companies.id
      partner_id: pc.partner_id ?? null,   // partners.id — null if no account
      full_name: pc.partners?.full_name ?? pc.invited_name ?? pc.invited_email ?? 'Unknown',
      email: pc.partners?.email ?? pc.invited_email ?? '',
    }))

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/sales"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to sales
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register sale</h1>
        <p className="text-gray-500 text-sm mt-1">
          Record a new sale — direct or through a partner
        </p>
      </div>

      <RegisterSaleForm
        listings={listings}
        plans={plans}
        partners={partners}
      />
    </div>
  )
}