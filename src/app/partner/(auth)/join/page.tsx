'use client'

import { useState, useEffect, useTransition } from 'react'
import { joinCompanyWithCode, setActiveCompany } from '@/actions/partner-company'
import Link from 'next/link'
import { Loader2, Check, Building2 } from 'lucide-react'

export default function JoinCompanyPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ companyName: string; companyId: string } | null>(null)
  const [codePrefill, setCodePrefill] = useState('')

  // Prefill company code when arriving from an invite link (/invite?code=…)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) setCodePrefill(code.toUpperCase().trim())
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const code = formData.get('company_code') as string

    startTransition(async () => {
      const result = await joinCompanyWithCode(code)
      if (!result.success) {
        setError(result.error)
        return
      }
      const data = result.data as { companyName: string; companyId: string }
      setSuccess(data)
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Joined!</h1>
          <p className="text-gray-500 text-sm">
            You&apos;ve successfully joined <strong>{success.companyName}</strong>.
          </p>
          <button
            onClick={() => {
              startTransition(async () => {
                await setActiveCompany(success.companyId)
              })
            }}
            disabled={isPending}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Loading…</>
            ) : (
              <>Open {success.companyName} portal</>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join a company</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter the company code given to you by your company
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company code
              </label>
              <input
                name="company_code"
                type="text"
                required
                value={codePrefill}
                onChange={(e) => setCodePrefill(e.target.value.toUpperCase())}
                placeholder="e.g. TEST8E"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Joining…</>
              ) : 'Join company'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link href="/partner/dashboard" className="text-gray-500 hover:underline">
            ← Back to portal
          </Link>
        </p>
      </div>
    </div>
  )
}