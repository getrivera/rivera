'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createListing } from '@/actions/listings'
import { ChevronLeft } from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import Link from 'next/link'

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

export default function NewListingPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [commissionType, setCommissionType] = useState('fixed')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await createListing(formData)
      } catch (err) {
        const error = err as { digest?: string; message?: string }
        if (!error?.digest?.includes('NEXT_REDIRECT')) {
          setError('Failed to create listing. Please try again.')
        }
      }
    })
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/listings" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ChevronLeft size={16} /> Back to listings
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">1</div>
          <h1 className="text-2xl font-bold text-gray-900">Create listing</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">Step 1 of 3 — Property details</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Property details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Listing title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Luxury Plots at Green Valley Estate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property type <span className="text-red-500">*</span>
            </label>
            <input
              name="property_type"
              type="text"
              required
              placeholder="e.g. Residential Plot, Duplex, Commercial Land"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Enter your own property type — fully flexible</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Describe the property, features, and benefits..."
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
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="location_state"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                name="location_city"
                type="text"
                required
                placeholder="e.g. Lekki"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              name="location_address"
              type="text"
              placeholder="e.g. Km 12, Lekki-Epe Expressway"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Pricing & Units */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Pricing & units</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price per unit (₦) <span className="text-red-500">*</span>
            </label>
            <MoneyInput
              name="price_naira"
              required
              placeholder="e.g. 5,000,000"
              prefix="₦"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit type <span className="text-red-500">*</span>
              </label>
              <select
                name="unit_type"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {UNIT_TYPES.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total available <span className="text-red-500">*</span>
              </label>
              <input
                name="units_total"
                type="number"
                required
                min="1"
                step="0.01"
                placeholder="e.g. 50"
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
              defaultChecked
              className="rounded border-gray-300"
            />
            <label htmlFor="show_units" className="text-sm text-gray-700">
              Show available units count to partners
            </label>
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Commission structure</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission type <span className="text-red-500">*</span>
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
                <span className="text-red-500"> *</span>
              </label>
              {commissionType === 'fixed' ? (
                <MoneyInput
                  name="commission_value"
                  required
                  placeholder="e.g. 500,000"
                  prefix="₦"
                />
              ) : (
                <input
                  name="commission_value"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commission trigger <span className="text-red-500">*</span>
            </label>
            <select
              name="commission_trigger"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {COMMISSION_TRIGGERS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              name="commission_clawback"
              type="checkbox"
              id="clawback"
              value="true"
              className="rounded border-gray-300"
            />
            <label htmlFor="clawback" className="text-sm text-gray-700">
              Claw back commission if buyer defaults
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Saving…' : 'Save & continue →'}
          </button>
        </div>
      </form>
    </div>
  )
}