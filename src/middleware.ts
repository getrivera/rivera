import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'rivera-staging.vercel.app'
  const pathname = request.nextUrl.pathname

  // ── Partner portal routing ─────────────────────────────────────────────
  if (
    hostname === `partners.${rootDomain}` &&
    !pathname.startsWith('/partner') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = `/partner${pathname}`
    return NextResponse.rewrite(url)
  }

  // ── Subscription enforcement ───────────────────────────────────────────
  if (
    process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true' &&
    !pathname.startsWith('/billing') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/partner')
  ) {
    // Check subscription status — done in layout, not middleware for now
    // Middleware would need DB access which slows all requests
    // Instead, layout.tsx handles redirect for suspended companies
  }

  // ── Session refresh ────────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}