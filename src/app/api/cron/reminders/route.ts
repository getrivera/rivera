import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processAutomatedReminders } from '@/actions/reminders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Get all companies with reminders enabled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companiesRaw } = await (adminClient as any)
    .from('companies')
    .select('id')
    .eq('reminders_enabled', true)

  const companies = (companiesRaw ?? []) as { id: string }[]

  let processed = 0
  for (const company of companies) {
    await processAutomatedReminders(company.id)
    processed++
  }

  return NextResponse.json({ ok: true, processed })
}