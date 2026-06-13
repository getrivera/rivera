import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ⚠️  SERVICE ROLE — bypasses RLS.
// Use ONLY in trusted server-side contexts:
//   - Webhook handlers (Paystack, Termii)
//   - Cron jobs (reminder scheduling)
//   - Admin operations initiated by PropPartner staff
// NEVER import this in Client Components or expose to the browser.

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
