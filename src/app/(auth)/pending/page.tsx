import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/actions/auth'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not logged in, go to login
  if (!user) redirect('/login')

  const email = user.email ?? ''

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-50 border border-yellow-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Your account is under review
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          We've received your registration and our team is reviewing your account.
          You'll receive an email at <strong className="text-gray-700">{email}</strong> once
          you're approved — usually within 24 hours.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left mb-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">Account created</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            </div>
            <span className="text-sm text-gray-600">Under review by Rivera team</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
            </div>
            <span className="text-sm text-gray-400">Account activated</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
            </div>
            <span className="text-sm text-gray-400">Ready to use</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          Questions? Email us at{' '}
          <a href="mailto:hello@getrivera.co" className="text-brand-500 hover:underline">
            hello@getrivera.co
          </a>
        </p>

        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}