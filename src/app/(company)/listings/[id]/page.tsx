import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate, formatUnits, formatRemainingUnits } from '@/lib/utils'
import { ListingActions } from './listing-actions'
import Link from 'next/link'
import {
  MapPin,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  Calendar,
  Percent,
} from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

type Listing = {
  id: string
  title: string
  description: string | null
  property_type: string
  location_state: string
  location_city: string
  location_address: string | null
  price_kobo: number
  unit_type: string
  units_total: number
  units_sold: number
  commission_type: string
  commission_value: number
  commission_trigger: string
  commission_clawback: boolean
  show_units_to_partners: boolean
  status: string
  gallery_urls: string[]
  created_at: string
}

type InstallmentPlan = {
  id: string
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_count: number
  installment_amount_kobo: number
  penalty_rate: number
}

type MarketingAsset = {
  id: string
  file_name: string
  file_type: string
  storage_url: string
  size_bytes: number
  download_count: number
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  sold_out: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-600',
}

const TRIGGER_LABELS: Record<string, string> = {
  on_deposit: 'After deposit received',
  per_installment: 'Per installment received',
  on_full_payment: 'After full payment',
  on_milestone: 'After 50% paid',
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string }
}) {
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

  const { data: listingData } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', staff.company_id)
    .single()

  if (!listingData) notFound()
  const listing = listingData as Listing

  const unitsRemaining = Math.max(0, (listing.units_total ?? 0) - (listing.units_sold ?? 0))
  const soldPercent = listing.units_total
    ? Math.round((listing.units_sold / listing.units_total) * 100)
    : 0

  const { data: plans } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('listing_id', listing.id)
    .order('duration_months', { ascending: true })

  const { data: assets } = await supabase
    .from('marketing_assets')
    .select('*')
    .eq('listing_id', listing.id)
    .order('created_at', { ascending: true })

  const canEdit = ['admin', 'manager'].includes(staff.role)

  return (
    <div className="p-6 max-w-4xl">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href="/listings"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to listings
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  STATUS_STYLES[listing.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {listing.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin size={14} />
              {listing.location_city}, {listing.location_state}
              {listing.location_address && ` — ${listing.location_address}`}
            </p>
          </div>

          {canEdit && (
            <ListingActions listingId={listing.id} status={listing.status} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Gallery */}
          {listing.gallery_urls && listing.gallery_urls.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 gap-1 p-1">
                {listing.gallery_urls.slice(0, 6).map((url, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg overflow-hidden bg-gray-100"
                  >
                    <img
                      src={url}
                      alt={`Gallery ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {listing.description}
              </p>
            </div>
          )}

          {/* Installment plans */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Installment plans</h2>
              {canEdit && (
                <Link
                  href={`/listings/${listing.id}/plans`}
                  className="text-xs text-brand-500 hover:underline"
                >
                  Edit plans
                </Link>
              )}
            </div>

            {!plans || plans.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                <p>Outright purchase only</p>
                <p className="text-xs mt-1">No installment plans configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(plans as InstallmentPlan[]).map((plan) => (
                  <div
                    key={plan.id}
                    className="border border-gray-100 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800 text-sm">
                        {plan.name}
                      </p>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {plan.duration_months} months
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
                      <div>
                        <p className="text-gray-400">Initial deposit</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {formatNaira(plan.deposit_amount_kobo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Monthly payment</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {formatNaira(plan.installment_amount_kobo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Installments</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {plan.installment_count} payments
                        </p>
                      </div>
                    </div>
                    {plan.penalty_rate > 0 && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <Percent size={10} />
                        {plan.penalty_rate}% late payment penalty per month
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Marketing kit */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Marketing kit</h2>
              {canEdit && (
                <Link
                  href={`/listings/${listing.id}/kit`}
                  className="text-xs text-brand-500 hover:underline"
                >
                  Manage kit
                </Link>
              )}
            </div>

            {!assets || assets.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No marketing assets uploaded yet
              </div>
            ) : (
              <div className="space-y-2">
                {(assets as MarketingAsset[]).map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {asset.file_type.startsWith('image/') ? (
                      <ImageIcon size={16} className="text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText size={16} className="text-orange-500 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {asset.file_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {asset.download_count} downloads
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Price & units */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Pricing & inventory</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Price per unit</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {formatNaira(listing.price_kobo)}
                </p>
              </div>
              {listing.units_total ? (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Total</span>
                    <span className="font-medium">
                      {formatUnits(listing.units_total, listing.unit_type)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Sold</span>
                    <span className="font-medium text-orange-600">
                      {formatUnits(listing.units_sold ?? 0, listing.unit_type)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Remaining</span>
                    <span className={`font-medium ${unitsRemaining === 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatRemainingUnits(listing.units_total, listing.units_sold ?? 0, listing.unit_type)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {soldPercent}% sold
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Commission */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Commission</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">
                  {listing.commission_type === 'fixed'
                    ? formatNaira(listing.commission_value)
                    : `${listing.commission_value}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trigger</span>
                <span className="font-medium text-right text-xs">
                  {TRIGGER_LABELS[listing.commission_trigger] ?? listing.commission_trigger}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Clawback on default</span>
                <span className={`font-medium ${listing.commission_clawback ? 'text-red-500' : 'text-green-600'}`}>
                  {listing.commission_clawback ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{listing.property_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{formatDate(listing.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Units shown to partners</span>
                <span className={`font-medium ${listing.show_units_to_partners ? 'text-green-600' : 'text-gray-400'}`}>
                  {listing.show_units_to_partners ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}