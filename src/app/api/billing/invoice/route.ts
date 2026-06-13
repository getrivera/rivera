import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateMonthlyInvoice } from '@/actions/billing'
import { BILLING_ENABLED } from '@/lib/billing'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BILLING_ENABLED) {
    return NextResponse.json({ ok: true, message: 'Billing not enabled' })
  }

  const adminClient = createAdminClient()

  // Get last month
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const month = lastMonth.toISOString().slice(0, 7)

  // Get all active companies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companiesRaw } = await (adminClient as any)
    .from('company_subscriptions')
    .select('company_id')
    .in('status', ['active', 'trialing', 'past_due'])

  const companies = (companiesRaw ?? []) as { company_id: string }[]

  let generated = 0
  let skipped = 0
  let errors = 0

  for (const company of companies) {
    const result = await generateMonthlyInvoice(company.company_id, month)
    if (result.success) {
      const data = result.data as { skipped?: boolean }
      data.skipped ? skipped++ : generated++
    } else {
      errors++
    }
  }

  return NextResponse.json({ ok: true, month, generated, skipped, errors })
}