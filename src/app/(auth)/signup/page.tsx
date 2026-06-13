'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signupCompany } from '@/actions/auth'

export default function SignupPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    startTransition(async () => {
      const result = await signupCompany(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Account created — we're reviewing it
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
          Your company account has been submitted. We typically review new accounts within 24 hours. You'll receive an email once your account is active and ready to use.
        </p>
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left">
          <p className="text-xs font-medium text-gray-500 mb-2">What happens next</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-xs text-gray-500">
              <span className="text-brand-500 font-bold mt-0.5">1.</span>
              Our team reviews your account
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500">
              <span className="text-brand-500 font-bold mt-0.5">2.</span>
              You receive an email when you're approved
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-500">
              <span className="text-brand-500 font-bold mt-0.5">3.</span>
              Sign in and start managing your partner network
            </li>
          </ul>
        </div>
        <Link
          href="/login"
          className="inline-block mt-6 text-sm text-brand-500 font-medium hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Register your company</h2>
      <p className="text-sm text-gray-500 mb-6">
        Set up your Rivera account to manage your partner network
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
            Company name
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Acme Realty Ltd"
          />
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
            Your full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Adebayo Johnson"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-500 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}