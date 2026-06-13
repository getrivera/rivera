import { createClient } from '@/lib/supabase/server'
import { getOnboardingProgress } from '@/lib/onboarding'
import { isOnboardingComplete } from '@/lib/onboarding-utils'
import { OnboardingWidget } from '@/components/layout/onboarding-widget'
import { formatNaira, formatDate } from '@/lib/utils'
import { resolvePeriod } from '@/lib/period-utils'
import Link from 'next/link'
import {
  ArrowUpRight, Users, Building2, ShoppingBag,
  Banknote, TrendingUp, Clock,
} from 'lucide-react'
import type { Period } from './period-selector'

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardStats = {
  partner_count: number
  listing_count: number
  buyer_count: number
  buyer_count_period: number
  commission_paid: number
  commission_pending_total: number
  commission_pending_count: number
  recent_sales: {
    id: string
    full_name: string
    status: string
    created_at: string
    listing_title: string | null
  }[]
  top_partners: {
    partner_id: string
    full_name: string
    sale_count: number
    commission_total: number
  }[]
  monthly_sales: {
    month: string
    count: number
  }[]
}

const STATUS_STYLES: Record<string, string> = {
  pending_deposit: 'bg-yellow-100 text-yellow-700',
  on_track:        'bg-green-100 text-green-700',
  overdue:         'bg-red-100 text-red-600',
  fully_paid:      'bg-blue-100 text-blue-700',
  defaulted:       'bg-gray-100 text-gray-500',
  cancelled:       'bg-gray-100 text-gray-400',
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchDashboardStats(
  companyId: string,
  fromIso: string,
  toIso: string
): Promise<DashboardStats> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_dashboard_stats', {
    p_company_id: companyId,
    p_from: fromIso,
    p_to: toIso,
  })
  if (error) throw new Error(error.message)
  return data as DashboardStats
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, href,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  href: string
}) {
  return (
    <Link
      href={href}
      className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon size={17} className="text-brand-500" />
        </div>
        <ArrowUpRight size={15} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Link>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  companyId: string
  userId: string
  period: Period
  from?: string
  to?: string
}

// ── Main component ────────────────────────────────────────────────────────────

export async function DashboardData({ companyId, userId, period, from, to }: Props) {
  const dateRange = resolvePeriod(period, from, to)

  const fromIso = dateRange.from?.toISOString() ?? '2000-01-01T00:00:00.000Z'
  const toIso = dateRange.to?.toISOString() ?? new Date().toISOString()

  // Single RPC call — replaces 8 separate queries
  const stats = await fetchDashboardStats(companyId, fromIso, toIso)

  // Onboarding — separate, needs to be fresh
  const onboarding = await getOnboardingProgress(companyId)
  const showOnboarding = onboarding && !isOnboardingComplete(onboarding)

  // Build month chart — fill in missing months with 0
  const now = new Date()
  const monthBuckets: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
  }
  stats.monthly_sales.forEach(({ month, count }) => {
    if (month in monthBuckets) monthBuckets[month] = Number(count)
  })
  const monthData = Object.entries(monthBuckets).map(([month, count]) => ({ month, count }))
  const maxCount = Math.max(...monthData.map((m) => m.count), 1)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Partners"
          value={stats.partner_count}
          href="/partners"
          icon={Users}
        />
        <StatCard
          label="Sales"
          value={stats.buyer_count_period}
          sub={`${stats.buyer_count} total all time`}
          href="/sales"
          icon={ShoppingBag}
        />
        <StatCard
          label="Active Listings"
          value={stats.listing_count}
          href="/listings"
          icon={Building2}
        />
        <StatCard
          label="Commission Paid"
          value={formatNaira(stats.commission_paid)}
          sub={stats.commission_pending_count > 0
            ? `${formatNaira(stats.commission_pending_total)} pending`
            : undefined}
          href="/commissions"
          icon={Banknote}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">Sales trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                New buyers registered — last 6 months
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <TrendingUp size={13} />
              <span>{stats.buyer_count} total</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-32">
            {monthData.map((m, i) => {
              const monthLabel = MONTH_LABELS[m.month.split('-')[1]] ?? m.month
              const isCurrentMonth = i === monthData.length - 1
              const heightPct = Math.round((m.count / maxCount) * 100)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {m.count > 0 ? m.count : ''}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isCurrentMonth ? 'bg-brand-500' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      style={{ height: `${Math.max(heightPct, m.count > 0 ? 8 : 4)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    isCurrentMonth ? 'text-brand-500' : 'text-gray-400'
                  }`}>
                    {monthLabel}
                  </span>
                </div>
              )
            })}
          </div>
          {maxCount === 0 && (
            <p className="text-center text-sm text-gray-400 mt-4">No sales yet</p>
          )}
        </div>

        {/* Pending commissions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Awaiting action</h2>
              <p className="text-xs text-gray-400 mt-0.5">Commissions needing approval</p>
            </div>
            <Clock size={15} className="text-gray-300" />
          </div>
          {stats.commission_pending_count === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">✓</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">All clear</p>
              <p className="text-xs text-gray-400 mt-0.5">No commissions awaiting approval</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    {stats.commission_pending_count} commission{stats.commission_pending_count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-yellow-600 mt-0.5">Ready to review</p>
                </div>
                <p className="text-sm font-bold text-yellow-800">
                  {formatNaira(stats.commission_pending_total)}
                </p>
              </div>
              <Link
                href="/commissions"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Review commissions
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sales */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent sales</h2>
            <Link href="/sales" className="text-xs text-brand-500 hover:underline font-medium">
              View all →
            </Link>
          </div>
          {stats.recent_sales.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sales registered yet</p>
          ) : (
            <div className="space-y-1">
              {stats.recent_sales.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/sales/${sale.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sale.full_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {sale.listing_title ?? '—'} · {formatDate(sale.created_at)}
                    </p>
                  </div>
                  <span className={`ml-3 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_STYLES[sale.status] ?? 'bg-gray-100 text-gray-500'
                  }`}>
                    {sale.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top partners */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top partners</h2>
            <Link href="/partners" className="text-xs text-brand-500 hover:underline font-medium">
              View all →
            </Link>
          </div>
          {stats.top_partners.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No partner activity yet</p>
          ) : (
            <div className="space-y-1">
              {stats.top_partners.map((partner, i) => (
                <div
                  key={partner.partner_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700'
                    : i === 1 ? 'bg-gray-100 text-gray-600'
                    : i === 2 ? 'bg-orange-50 text-orange-600'
                    : 'bg-gray-50 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {partner.full_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {partner.sale_count} sale{partner.sale_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 flex-shrink-0">
                    {formatNaira(partner.commission_total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showOnboarding && onboarding && (
        <OnboardingWidget onboarding={onboarding} />
      )}
    </div>
  )
}