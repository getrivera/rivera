'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const MULTI_COMPANY_ENABLED = process.env.NEXT_PUBLIC_PARTNER_MULTI_COMPANY === 'true'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    startTransition(async () => {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError('Invalid email or password')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Authentication failed. Please try again.')
        return
      }

      const { data: partnerRaw } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!partnerRaw) {
        setError('Partner profile not found. Please sign up first.')
        return
      }

      const partner = partnerRaw as { id: string }

      const { data: companiesRaw } = await supabase
        .from('partner_companies')
        .select('company_id')
        .eq('partner_id', partner.id)
        .eq('status', 'active')

      const companies = (companiesRaw ?? []) as { company_id: string }[]

      await new Promise(resolve => setTimeout(resolve, 300))

      // Carry an invite code through login so the join page prefills it
      const inviteCode = new URLSearchParams(window.location.search).get('code')

      if (inviteCode) {
        window.location.href = `/partner/join?code=${encodeURIComponent(inviteCode)}`
      } else if (companies.length === 0) {
        window.location.href = '/partner/join'
      } else if (companies.length === 1 || !MULTI_COMPANY_ENABLED) {
        // Single company or multi-company disabled — go straight to dashboard
        window.location.href = '/partner/dashboard'
      } else {
        // Multiple companies and feature enabled — go to picker
        window.location.href = '/partner/pick-company'
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Partner portal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to browse listings, register buyers and track your commissions
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-400 mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-brand-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Signing in…</>
              ) : 'Sign in to partner portal'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/partner/signup" className="text-brand-500 hover:underline font-medium">
              Sign up as a partner
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Are you a company?{' '}
          <Link href="/login" className="text-gray-500 hover:underline">
            Sign in to company portal →
          </Link>
        </p>
      </div>
    </div>
  )
}