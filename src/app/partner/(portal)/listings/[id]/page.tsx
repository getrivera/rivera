import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatRemainingUnits } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, MapPin, Download, FileText } from 'lucide-react'

export default async function PartnerListingDetailPage({
  params,
}: {
  params: { id: string }
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

  // SECURITY: scope the lookup to companies this partner actually belongs to.
  // Previously any partner could open ANY company's active listing by ID.
  const { data: pcRaw } = await supabase
    .from('partner_companies')
    .select('company_id')
    .eq('partner_id', partner.id)
    .eq('status', 'active')

  const companyIds = ((pcRaw ?? []) as { company_id: string }[]).map((pc) => pc.company_id)
  if (companyIds.length === 0) notFound()

  const { data: listingRaw } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .in('company_id', companyIds)
    .eq('status', 'active')
    .single()

  if (!listingRaw) notFound()

  type Listing = {
    id: string
    title: string
    description: string | null
    property_type: string
    location_city: string
    location_state: string
    location_address: string | null
    price_kobo: number
    unit_type: string
    units_total: number
    units_sold: number
    show_units_to_partners: boolean
    commission_type: string
    commission_value: number
    commission_trigger: string
    gallery_urls: string[] | null
  }

  const listing = listingRaw as Listing
  const remaining = Math.max(0, (listing.units_total ?? 0) - (listing.units_sold ?? 0))

  const { data: plansRaw } = await supabase
    .from('installment_plans')
    .select('id, name, duration_months, deposit_amount_kobo, installment_amount_kobo, installment_count')
    .eq('listing_id', listing.id)

  const plans = (plansRaw ?? []) as {
    id: string
    name: string
    duration_months: number
    deposit_amount_kobo: number
    installment_amount_kobo: number
    installment_count: number
  }[]

  const { data: assetsRaw } = await supabase
    .from('marketing_assets')
    .select('id, file_name, file_type, storage_url, size_bytes')
    .eq('listing_id', listing.id)

  const assets = (assetsRaw ?? []) as {
    id: string
    file_name: string
    file_type: string
    storage_url: string
    size_bytes: number
  }[]

  const commissionDisplay = listing.commission_type === 'fixed'
    ? formatNaira(listing.commission_value)
    : `${listing.commission_value}% of sale price`

  const TRIGGER_LABELS: Record<string, string> = {
    on_deposit: 'After deposit received',
    per_installment: 'Per installment paid',
    on_full_payment: 'After full payment',
    on_milestone: 'After 50% paid',
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/partner/listings"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to listings
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Gallery */}
          {listing.gallery_urls && listing.gallery_urls.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 gap-1 p-1">
                {listing.gallery_urls.slice(0, 4).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${listing.title} ${i + 1}`}
                    className="w-full h-36 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">{listing.property_type}</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
              <MapPin size={14} />
              {listing.location_address
                ? `${listing.location_address}, ${listing.location_city}, ${listing.location_state}`
                : `${listing.location_city}, ${listing.location_state}`}
            </div>
            {listing.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
            )}
          </div>

          {/* Installment plans */}
          {plans.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Payment plans</h2>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-gray-100 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">{plan.name}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Duration</span>
                        <p className="font-medium">{plan.duration_months} months</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Deposit</span>
                        <p className="font-medium">{formatNaira(plan.deposit_amount_kobo)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Monthly</span>
                        <p className="font-medium">{formatNaira(plan.installment_amount_kobo)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Installments</span>
                        <p className="font-medium">{plan.installment_count} payments</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marketing kit */}
          {assets.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Marketing kit</h2>
              <div className="space-y-2">
                {assets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{asset.file_name}</p>
                        <p className="text-xs text-gray-400">
                          {(asset.size_bytes / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <Download size={14} className="text-brand-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Price */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-3xl font-bold text-gray-900">
              {formatNaira(listing.price_kobo)}
            </p>
            {listing.show_units_to_partners && listing.units_total ? (
              <p className={`text-sm mt-1 ${remaining === 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {remaining === 0
                  ? 'Sold out'
                  : formatRemainingUnits(listing.units_total, listing.units_sold ?? 0, listing.unit_type)
                }
              </p>
            ) : null}
          </div>

          {/* Commission */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Your commission</h2>
            <p className="text-2xl font-bold text-green-600">{commissionDisplay}</p>
            <p className="text-xs text-gray-500 mt-2">
              Paid {TRIGGER_LABELS[listing.commission_trigger] ?? listing.commission_trigger}
            </p>
          </div>

          {/* Register buyer CTA */}
          {remaining > 0 && (
            <Link
              href={`/partner/sales/new?listing_id=${listing.id}`}
              className="block w-full text-center py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Register a buyer for this listing
            </Link>
          )}
          {remaining === 0 && (
            <p className="w-full text-center py-3 bg-gray-100 text-gray-400 text-sm font-medium rounded-xl">
              Sold out
            </p>
          )}
        </div>
      </div>
    </div>
  )
}