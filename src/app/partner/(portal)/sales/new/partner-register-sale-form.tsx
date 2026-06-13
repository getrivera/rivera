'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatNaira } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { partnerRegisterSale } from '@/actions/partner-sales'

type Listing = {
  id: string
  title: string
  location_city: string
  location_state: string
}

type Plan = {
  id: string
  listing_id: string
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_amount_kobo: number
}

type Props = {
  listings: Listing[]
  plans: Plan[]
  partnerId: string
  defaultListingId?: string
}

export function PartnerRegisterSaleForm({ listings, plans, partnerId, defaultListingId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedListingId, setSelectedListingId] = useState(defaultListingId ?? '')

  const listingPlans = plans.filter((p) => p.listing_id === selectedListingId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('partner_id', partnerId)

    startTransition(async () => {
      const result = await partnerRegisterSale(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/partner/sales')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Listing */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Property</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Listing <span className="text-red-500">*</span>
          </label>
          <select
            name="listing_id"
            required
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select a listing</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} — {l.location_city}, {l.location_state}
              </option>
            ))}
          </select>
        </div>

        {selectedListingId && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment plan
              </label>
              <select
                name="installment_plan_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Outright purchase (no plan)</option>
                {listingPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.duration_months} months, {formatNaira(p.deposit_amount_kobo)} deposit,{' '}
                    {formatNaira(p.installment_amount_kobo)}/month
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit quantity <span className="text-red-500">*</span>
              </label>
              <input
                name="unit_quantity"
                type="number"
                required
                min={1}
                defaultValue={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Number of units your client is purchasing
              </p>
            </div>
          </>
        )}
      </div>

      {/* Buyer details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Buyer details</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              type="text"
              required
              placeholder="e.g. Chukwuemeka Okafor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              name="phone"
              type="tel"
              required
              placeholder="e.g. 08012345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              placeholder="buyer@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
          <span className="ml-2 text-xs text-gray-400 font-normal">optional</span>
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any additional notes…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Submitting…</>
          ) : 'Submit buyer'}
        </button>
      </div>
    </form>
  )
}