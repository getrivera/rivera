'use client'

import { useState, useTransition } from 'react'
import { registerSale } from '@/actions/sales'
import { formatNaira } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type Listing = {
  id: string
  title: string
  location_city: string
  location_state: string
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
  id: string
  partner_id: string | null
  full_name: string
  email: string
}

type Props = {
  listings: Listing[]
  plans: InstallmentPlan[]
  partners: Partner[]
}

export function RegisterSaleForm({ listings, plans, partners }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedListingId, setSelectedListingId] = useState('')
  const [isDirect, setIsDirect] = useState(true)

  const listingPlans = plans.filter((p) => p.listing_id === selectedListingId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    if (isDirect) {
      formData.delete('partner_company_id')
    }

    startTransition(async () => {
      try {
        await registerSale(formData)
      } catch (err) {
        const e = err as { digest?: string }
        if (!e?.digest?.includes('NEXT_REDIRECT')) {
          setError('Failed to register sale. Please try again.')
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sale type */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Sale type</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsDirect(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              isDirect
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Direct sale
          </button>
          <button
            type="button"
            onClick={() => setIsDirect(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              !isDirect
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Referred by partner
          </button>
        </div>
      </div>

      {/* Partner selection */}
      {!isDirect && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Partner</h2>
          {partners.length === 0 ? (
            <p className="text-sm text-gray-400">
              No active partners yet. Invite partners first.
            </p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select partner <span className="text-red-500">*</span>
              </label>
              <select
                name="partner_company_id"
                required={!isDirect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a partner</option>
                {partners.map((p) => (
                  <option
                    key={p.id}
                    value={JSON.stringify({ pcId: p.id, partnerId: p.partner_id })}
                  >
                    {p.full_name} — {p.email}
                    {!p.partner_id ? ' (pending signup)' : ''}
                  </option>
                ))}
              </select>
              {partners.some((p) => !p.partner_id) && (
                <p className="text-xs text-yellow-600 mt-1">
                  Partners marked as &quot;pending signup&quot; haven&apos;t created their account yet.
                  Sales can still be registered but commissions will be held until they sign up.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Listing & plan */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Listing</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property listing <span className="text-red-500">*</span>
          </label>
          {listings.length === 0 ? (
            <p className="text-sm text-gray-400">
              No active listings. Publish a listing first.
            </p>
          ) : (
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
          )}
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
                    {p.name} — {p.duration_months} months,{' '}
                    {formatNaira(p.deposit_amount_kobo)} deposit,{' '}
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
                Number of units the buyer is purchasing
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="buyer@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIN
              <span className="ml-1 text-xs text-gray-400">(optional)</span>
            </label>
            <input
              name="nin"
              type="text"
              placeholder="National Identification Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Next of kin */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">
          Next of kin
          <span className="ml-2 text-xs text-gray-400 font-normal">optional</span>
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              name="next_of_kin_name"
              type="text"
              placeholder="e.g. Ngozi Okafor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              name="next_of_kin_phone"
              type="tel"
              placeholder="e.g. 08098765432"
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
          placeholder="Any additional notes about this sale…"
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
            <><Loader2 size={14} className="animate-spin" /> Registering…</>
          ) : (
            'Register sale'
          )}
        </button>
      </div>
    </form>
  )
}