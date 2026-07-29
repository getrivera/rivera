import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/confirm
//
// Handles token_hash-based email links — used specifically for staff invites
// (admin.inviteUserByEmail cannot use the PKCE `?code=` flow because the
// person accepting the invite is on a different browser than the admin who
// sent it, so there's no code verifier to exchange). This route is the
// target referenced by the "Invite user" email template in the Supabase
// dashboard:
//
//   {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password
//
// Signup and password-recovery links keep using /api/auth/callback (PKCE),
// which is unaffected by this route.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/reset-password'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invite_link_invalid`)
}