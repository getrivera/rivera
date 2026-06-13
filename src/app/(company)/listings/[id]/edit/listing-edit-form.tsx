'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateListing } from '@/actions/listings'
import { Loader2, Check } from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'

const UNIT_TYPES = [
  { value: 'number', label: 'Units / Plots (count)' },
  { value: 'acres', label: 'Acres' },
  { value: 'hectares', label: 'Hectares' },
  { value: 'sqm', label: 'Square metres (sqm)' },
  { value: 'sqft', label: 'Square feet (sqft)' },
]

const COMMISSION_TRIGGERS = [
  { value: 'on_deposit', label: 'After deposit received' },
  { value: 'per_installment', label: 'Per installment received (proportional)' },
  { value: 'on_full_payment', label: 'After full payment completed' },
  { value: 'on_milestone', label: 'After 50% of total paid' },
]

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ListingEditForm({ listing }: { listing: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commissionType, setCommissionType] = useState(
    listing.commission_type ?? 'fixed'
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateListing(listing.id, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setTimeout(() => {
        router.push(`/listings/${listing.id}/plans`)
      }, 500)
    })
  }

  const priceNaira = listing.price_kobo / 100
  const commissionNaira =
    listing.commission_type === 'fixed'
      ? listing.commission_value / 100
      : listing.commission_value

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
          <Check size={14} /> Saved — going to plans…
        </div>
      )}

      {/* Property details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Property details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            type="text"
            defaultValue={listing.title}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property type
          </label>
          <input
            name="property_type"
            type="text"
            defaultValue={listing.property_type}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={listing.description ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      </div>

      {/* Location */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Location</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              name="location_state"
              defaultValue={listing.location_state}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              name="location_city"
              type="text"
              defaultValue={listing.location_city}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            name="location_address"
            type="text"
            defaultValue={listing.location_address ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Pricing & units */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Pricing & units</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price per unit (₦)
          </label>
          <MoneyInput
            name="price_naira"
            defaultValue={priceNaira}
            required
            prefix="₦"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit type
            </label>
            <select
              name="unit_type"
              defaultValue={listing.unit_type}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {UNIT_TYPES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total available
            </label>
            <input
              name="units_total"
              type="number"
              defaultValue={listing.units_total}
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            name="show_units_to_partners"
            type="checkbox"
            id="show_units"
            value="true"
            defaultChecked={listing.show_units_to_partners}
            className="rounded border-gray-300"
          />
          <label htmlFor="show_units" className="text-sm text-gray-700">
            Show available units count to partners
          </label>
        </div>
      </div>

      {/* Commission */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Commission</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              name="commission_type"
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="fixed">Fixed amount (₦)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {commissionType === 'fixed' ? 'Amount (₦)' : 'Percentage (%)'}
            </label>
            {commissionType === 'fixed' ? (
              <MoneyInput
                name="commission_value"
                defaultValue={commissionNaira}
                required
                prefix="₦"
              />
            ) : (
              <input
                name="commission_value"
                type="number"
                defaultValue={commissionNaira}
                required
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trigger
          </label>
          <select
            name="commission_trigger"
            defaultValue={listing.commission_trigger}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {COMMISSION_TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            name="commission_clawback"
            type="checkbox"
            id="clawback"
            value="true"
            defaultChecked={listing.commission_clawback}
            className="rounded border-gray-300"
          />
          <label htmlFor="clawback" className="text-sm text-gray-700">
            Claw back commission if buyer defaults
          </label>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : success ? (
            <>
              <Check size={14} /> Saved — going to plans…
            </>
          ) : (
            'Save & continue to plans →'
          )}
        </button>
      </div>
    </form>
  )
}