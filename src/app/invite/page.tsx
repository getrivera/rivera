import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Building2, ArrowRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// /invite?code=XXXXXX
//
// This is the landing page for partner invite links shared by companies
// (generated in the "Invite partner" modal). Previously this route did not
// exist and every shared invite link 404'd.
//
// It validates the company code, shows who is inviting them, and routes the
// visitor to partner signup (new) or partner login → join (existing), with
// the code carried through as a query param so they never retype it.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function InviteLandingPage({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  const code = (searchParams.code ?? '').toUpperCase().trim()

  let companyName: string | null = null
  let logoUrl: string | null = null
  let brandColour: string | null = null

  if (code) {
    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (adminClient as any)
      .from('companies')
      .select('name, logo_url, brand_colour')
      .eq('company_code', code)
      .single()

    const company = data as { name: string; logo_url: string | null; brand_colour: string | null } | null
    if (company) {
      companyName = company.name
      logoUrl = company.logo_url
      brandColour = company.brand_colour
    }
  }

  // Invalid or missing code — explain instead of erroring
  if (!companyName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={22} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid invite link</h1>
          <p className="text-gray-500 text-sm mb-6">
            This invite link is missing or has an invalid company code. Please ask the
            company that invited you for a new link or their company code.
          </p>
          <Link
            href="/partner/join"
            className="inline-block w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Enter a company code manually
          </Link>
        </div>
      </div>
    )
  }

  const accent = brandColour ?? '#1B4F72'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName}
              className="w-14 h-14 rounded-xl object-contain mx-auto mb-4 border border-gray-100 bg-white p-1"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl"
              style={{ backgroundColor: accent }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {companyName} invited you
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Join {companyName}&apos;s partner network to market their listings and earn
            commissions on every sale you refer.
          </p>

          <div className="space-y-3">
            <Link
              href={`/partner/signup?code=${encodeURIComponent(code)}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Create a partner account
              <ArrowRight size={14} />
            </Link>
            <Link
              href={`/partner/login?code=${encodeURIComponent(code)}`}
              className="block w-full py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              I already have a partner account
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Company code: <span className="font-mono font-medium text-gray-500">{code}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
