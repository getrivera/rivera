import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PartnerRegisterSaleForm } from './partner-register-sale-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function PartnerNewSalePage({
  searchParams,
}: {
  searchParams: { listing_id?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) redirect('/partner/login')
  const partner = partnerRaw as { id: string }

  // Get active companies
  const { data: pcRaw } = await supabase
    .from('partner_companies')
    .select('company_id')
    .eq('partner_id', partner.id)
    .eq('status', 'active')

  const companyIds = (pcRaw ?? []).map((pc: { company_id: string }) => pc.company_id)

  // Get active listings
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('id, title, location_city, location_state')
    .in('company_id', companyIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  type Listing = { id: string; title: string; location_city: string; location_state: string }
  const listings = (listingsRaw ?? []) as Listing[]

  // Get installment plans
  const { data: plansRaw } = await supabase
    .from('installment_plans')
    .select('id, listing_id, name, duration_months, deposit_amount_kobo, installment_amount_kobo')
    .in('company_id', companyIds)

  type Plan = {
    id: string
    listing_id: string
    name: string
    duration_months: number
    deposit_amount_kobo: number
    installment_amount_kobo: number
  }
  const plans = (plansRaw ?? []) as Plan[]

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/partner/sales"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to my sales
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register a buyer</h1>
        <p className="text-gray-500 text-sm mt-1">
          Submit a buyer for a property listing
        </p>
      </div>

      <PartnerRegisterSaleForm
        listings={listings}
        plans={plans}
        partnerId={partner.id}
        defaultListingId={searchParams.listing_id}
      />
    </div>
  )
}