import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate } from '@/lib/utils'
import { ReportsClient } from './reports-client'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

export type ReportData = {
  // Sales
  totalSalesCount: number
  totalSalesValue: number
  directSalesCount: number
  referredSalesCount: number

  // Invoices
  totalInvoiced: number
  totalCollected: number
  totalOutstanding: number

  // Commissions
  totalCommissionsPaid: number
  totalCommissionsDue: number

  // Monthly sales (last 6 months)
  monthlySales: { month: string; count: number; value: number }[]

  // Top listings
  topListings: { id: string; title: string; sales_count: number; value: number }[]

  // Partner leaderboard
  leaderboard: {
    rank: number
    partner_id: string
    full_name: string
    email: string
    sales_count: number
    commission_earned: number
  }[]

  // Company token for public leaderboard
  companySlug: string
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as StaffRecord

  // Date range — last 30 days default
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString()

  // ── Sales stats ──────────────────────────────────────────────────────────
  const { data: salesRaw } = await supabase
    .from('buyers')
    .select('id, source, created_at, listing_id')
    .eq('company_id', staff.company_id)
    .neq('status', 'cancelled')
    .gte('created_at', since)

  const sales = (salesRaw ?? []) as {
    id: string
    source: string
    created_at: string
    listing_id: string
  }[]

  const totalSalesCount = sales.length
  const directSalesCount = sales.filter((s) => s.source === 'direct').length
  const referredSalesCount = sales.filter((s) => s.source === 'partner').length

  // ── Invoice stats ────────────────────────────────────────────────────────
  const { data: invoicesRaw } = await supabase
    .from('buyer_invoices')
    .select('total_kobo, amount_paid_kobo, status')
    .eq('company_id', staff.company_id)
    .neq('status', 'voided')
    .gte('created_at', since)

  const invoices = (invoicesRaw ?? []) as {
    total_kobo: number
    amount_paid_kobo: number
    status: string
  }[]

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total_kobo, 0)
  const totalCollected = invoices.reduce((sum, i) => sum + i.amount_paid_kobo, 0)
  const totalOutstanding = totalInvoiced - totalCollected
  const totalSalesValue = totalInvoiced

  // ── Commission stats ─────────────────────────────────────────────────────
  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select('amount_kobo, status')
    .eq('company_id', staff.company_id)

  const commissions = (commissionsRaw ?? []) as {
    amount_kobo: number
    status: string
  }[]

  const totalCommissionsPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const totalCommissionsDue = commissions
    .filter((c) => ['due', 'approved', 'processing'].includes(c.status))
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  // ── Monthly sales (last 6 months) ────────────────────────────────────────
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: monthlySalesRaw } = await supabase
    .from('buyers')
    .select('created_at')
    .eq('company_id', staff.company_id)
    .neq('status', 'cancelled')
    .gte('created_at', sixMonthsAgo.toISOString())

  const monthlySalesData = (monthlySalesRaw ?? []) as { created_at: string }[]

  // Group by month
  const monthMap: Record<string, number> = {}
  monthlySalesData.forEach((s) => {
    const month = new Date(s.created_at).toLocaleString('default', {
      month: 'short',
      year: 'numeric',
    })
    monthMap[month] = (monthMap[month] ?? 0) + 1
  })

  // Build last 6 months array
  const monthlySales = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleString('default', { month: 'short', year: 'numeric' })
    return {
      month,
      count: monthMap[month] ?? 0,
      value: 0,
    }
  })

  // ── Top listings ─────────────────────────────────────────────────────────
  const { data: allSalesRaw } = await supabase
    .from('buyers')
    .select('listing_id')
    .eq('company_id', staff.company_id)
    .neq('status', 'cancelled')

  const allSales = (allSalesRaw ?? []) as { listing_id: string }[]

  const listingCounts: Record<string, number> = {}
  allSales.forEach((s) => {
    listingCounts[s.listing_id] = (listingCounts[s.listing_id] ?? 0) + 1
  })

  const topListingIds = Object.entries(listingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const { data: topListingsRaw } = topListingIds.length
    ? await supabase
        .from('listings')
        .select('id, title')
        .in('id', topListingIds)
    : { data: [] }

  const topListings = (topListingsRaw ?? []).map((l: { id: string; title: string }) => ({
    id: l.id,
    title: l.title,
    sales_count: listingCounts[l.id] ?? 0,
    value: 0,
  })).sort((a, b) => b.sales_count - a.sales_count)

  // ── Partner leaderboard ──────────────────────────────────────────────────
  const { data: leaderboardRaw } = await supabase
    .from('commissions')
    .select('partner_id, amount_kobo, status')
    .eq('company_id', staff.company_id)

  const leaderboardCommissions = (leaderboardRaw ?? []) as {
    partner_id: string
    amount_kobo: number
    status: string
  }[]

  // Aggregate by partner
  const partnerMap: Record<string, { sales_count: number; commission_earned: number }> = {}

  leaderboardCommissions.forEach((c) => {
    if (!partnerMap[c.partner_id]) {
      partnerMap[c.partner_id] = { sales_count: 0, commission_earned: 0 }
    }
    partnerMap[c.partner_id].sales_count += 1
    if (c.status === 'paid') {
      partnerMap[c.partner_id].commission_earned += c.amount_kobo
    }
  })

  const partnerIds = Object.keys(partnerMap)
  const { data: partnersRaw } = partnerIds.length
    ? await supabase
        .from('partners')
        .select('id, full_name, email')
        .in('id', partnerIds)
    : { data: [] }

  const partners = (partnersRaw ?? []) as { id: string; full_name: string; email: string }[]

  const leaderboard = partners
    .map((p, i) => ({
      rank: i + 1,
      partner_id: p.id,
      full_name: p.full_name,
      email: p.email,
      sales_count: partnerMap[p.id]?.sales_count ?? 0,
      commission_earned: partnerMap[p.id]?.commission_earned ?? 0,
    }))
    .sort((a, b) => b.sales_count - a.sales_count)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  // ── Company slug ─────────────────────────────────────────────────────────
  const { data: companyRaw } = await supabase
    .from('companies')
    .select('slug')
    .eq('id', staff.company_id)
    .single()

  const company = companyRaw as { slug: string } | null

  const reportData: ReportData = {
    totalSalesCount,
    totalSalesValue,
    directSalesCount,
    referredSalesCount,
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    totalCommissionsPaid,
    totalCommissionsDue,
    monthlySales,
    topListings,
    leaderboard,
    companySlug: company?.slug ?? '',
  }

  const publicLeaderboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/leaderboard/${company?.slug}`

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1 text-sm">Last 30 days</p>
        </div>
        <a
          href={publicLeaderboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={14} />
          Public leaderboard
        </a>
      </div>

      <ReportsClient data={reportData} />
    </div>
  )
}