import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatRemainingUnits } from '@/lib/utils'
import Link from 'next/link'
import { MapPin, Building2 } from 'lucide-react'

export default async function PartnerListingsPage() {
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

  const { data: pcRaw } = await supabase
    .from('partner_companies')
    .select('company_id')
    .eq('partner_id', partner.id)
    .eq('status', 'active')

  const companyIds = (pcRaw ?? []).map((pc: { company_id: string }) => pc.company_id)

  if (companyIds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Listings</h1>
        <p className="text-gray-500">No active company links found.</p>
      </div>
    )
  }

  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('id, title, property_type, location_city, location_state, price_kobo, unit_type, units_total, units_sold, show_units_to_partners, commission_type, commission_value, gallery_urls')
    .in('company_id', companyIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  type Listing = {
    id: string
    title: string
    property_type: string
    location_city: string
    location_state: string
    price_kobo: number
    unit_type: string
    units_total: number
    units_sold: number
    show_units_to_partners: boolean
    commission_type: string
    commission_value: number
    gallery_urls: string[] | null
  }

  const listings = (listingsRaw ?? []) as Listing[]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {listings.length} active listing{listings.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No listings yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Your company hasn&apos;t published any listings yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {listings.map((listing) => {
            const commissionDisplay = listing.commission_type === 'fixed'
              ? formatNaira(listing.commission_value)
              : `${listing.commission_value}%`

            const remaining = Math.max(0, (listing.units_total ?? 0) - (listing.units_sold ?? 0))

            return (
              <Link
                key={listing.id}
                href={`/partner/listings/${listing.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {listing.gallery_urls?.[0] ? (
                    <img
                      src={listing.gallery_urls[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 size={32} className="text-gray-300" />
                  )}
                </div>

                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1">{listing.property_type}</p>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {listing.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin size={11} />
                    {listing.location_city}, {listing.location_state}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {formatNaira(listing.price_kobo)}
                      </p>
                      {listing.show_units_to_partners && listing.units_total ? (
                        <p className={`text-xs mt-0.5 ${remaining === 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {remaining === 0
                            ? 'Sold out'
                            : formatRemainingUnits(listing.units_total, listing.units_sold ?? 0, listing.unit_type)
                          }
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Commission</p>
                      <p className="text-sm font-semibold text-green-600">
                        {commissionDisplay}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}