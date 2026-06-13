'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePartnerProfile } from '@/actions/partner-profile'
import { Check, Loader2 } from 'lucide-react'

type Partner = {
  id: string
  full_name: string
  email: string
  phone: string
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
}

export function PartnerProfileForm({ partner }: { partner: Partner }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updatePartnerProfile(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Personal info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Personal information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            name="full_name"
            type="text"
            required
            defaultValue={partner.full_name}
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
            defaultValue={partner.phone}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="text"
            value={partner.email}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>
      </div>

      {/* Bank details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Bank details</h2>
        <p className="text-xs text-gray-400">
          Used for commission payouts. Make sure these are correct.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bank name</label>
          <input
            name="bank_name"
            type="text"
            defaultValue={partner.bank_name ?? ''}
            placeholder="e.g. GTBank, Access Bank"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account number
          </label>
          <input
            name="bank_account_number"
            type="text"
            defaultValue={partner.bank_account_number ?? ''}
            placeholder="10-digit account number"
            maxLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account name
          </label>
          <input
            name="bank_account_name"
            type="text"
            defaultValue={partner.bank_account_name ?? ''}
            placeholder="Name as it appears on bank account"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : success ? (
            <><Check size={14} /> Saved</>
          ) : 'Save profile'}
        </button>
      </div>
    </form>
  )
}