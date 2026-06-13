'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { linkPartnerToCompany } from '@/actions/partner-auth'
import Link from 'next/link'
import { Loader2, Check } from 'lucide-react'

export default function PartnerSignupPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const phone = formData.get('phone') as string
    const companyCode = (formData.get('company_code') as string).toUpperCase().trim()

    startTransition(async () => {
      // Step 1: Sign up via browser client
      const supabase = createClient()
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/partner/login`,
        },
      })

      if (signupError) {
        setError(signupError.message)
        return
      }

      if (!data.user) {
        setError('Failed to create account. Please try again.')
        return
      }

      // Step 2: Create partner profile and link to company via server action
      const result = await linkPartnerToCompany({
        userId: data.user.id,
        email,
        fullName,
        phone,
        companyCode,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setSuccess(`Account created! You've joined ${result.data.companyName}. Please check your email to confirm your account, then sign in.`)
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account created!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{success}</p>
          <button
            onClick={() => router.push('/partner/login')}
            className="mt-6 w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create partner account</h1>
          <p className="text-gray-500 text-sm mt-1">Join your company on Rivera</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company code <span className="text-red-500">*</span>
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
            <p className="text-xs text-gray-400 mt-1">
              Get this from your company
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              type="text"
              required
              placeholder="e.g. Amaka Obi"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number <span className="text-red-500">*</span>
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
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="Min 8 characters"
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Creating account…</>
            ) : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/partner/login" className="text-brand-500 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}