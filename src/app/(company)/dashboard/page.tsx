import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { PeriodSelector } from './period-selector'
import { DashboardData } from './dashboard-data'
import { DashboardSkeleton } from './dashboard-skeleton'
import type { Period } from './period-selector'
import { resolvePeriod } from '@/lib/period-utils'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as { company_id: string; role: string }

  const { data: companyData } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', staff.company_id)
    .single()

  if (!companyData) redirect('/login')
  const company = companyData as { id: string; name: string }

  const period = (searchParams.period ?? 'this_month') as Period
  const dateRange = resolvePeriod(period, searchParams.from, searchParams.to)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const fullName = (user.user_metadata?.full_name as string)?.split(' ')[0] ?? 'there'

  // Periods to prefetch in background
  const prefetchPeriods: Period[] = ['today', 'last_7', 'last_30', 'this_month', 'this_year']

  return (
    <div className="p-6 space-y-6">
      {/* Invisible prefetch links — Next.js fetches these in background */}
      <div className="hidden" aria-hidden>
        {prefetchPeriods
          .filter((p) => p !== period)
          .map((p) => (
            <Link key={p} href={`/dashboard?period=${p}`} prefetch={true} />
          ))}
      </div>

      {/* Header — renders instantly */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {fullName}.
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Here's what's happening at {company.name}
            {dateRange.label !== 'All time'
              ? ` — ${dateRange.label.toLowerCase()}`
              : ''}.
          </p>
        </div>
        <PeriodSelector
          current={period}
          from={searchParams.from}
          to={searchParams.to}
        />
      </div>

      {/* Data — Suspense shows skeleton while loading */}
      <Suspense
        key={`${period}-${searchParams.from ?? ''}-${searchParams.to ?? ''}`}
        fallback={<DashboardSkeleton />}
      >
        <DashboardData
          companyId={staff.company_id}
          userId={user.id}
          period={period}
          from={searchParams.from}
          to={searchParams.to}
        />
      </Suspense>
    </div>
  )
}