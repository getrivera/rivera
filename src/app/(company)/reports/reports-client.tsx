'use client'

import { formatNaira } from '@/lib/utils'
import type { ReportData } from './page'
import Link from 'next/link'
import {
  ShoppingBag,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Download,
} from 'lucide-react'

type Props = { data: ReportData }

function DownloadButton({ type, label }: { type: string; label: string }) {
  return (
    <a
      href={`/api/reports/download?type=${type}`}
      download
      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
    >
      <Download size={12} />
      {label}
    </a>
  )
}

export function ReportsClient({ data }: Props) {
  const maxCount = Math.max(...data.monthlySales.map((m) => m.count), 1)

  return (
    <div className="space-y-6">
      {/* Download buttons */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Download reports</p>
        <div className="flex flex-wrap gap-2">
          <DownloadButton type="sales" label="Sales summary" />
          <DownloadButton type="commissions" label="Commission report" />
          <DownloadButton type="invoices" label="Invoice report" />
          <DownloadButton type="leaderboard" label="Partner leaderboard" />
          <DownloadButton type="partners" label="Partner list" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <ShoppingBag size={16} className="text-brand-500" />
            </div>
            <p className="text-sm text-gray-500">Total sales</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.totalSalesCount}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-gray-400">
              {data.directSalesCount} direct
            </span>
            <span className="text-xs text-gray-400">
              {data.referredSalesCount} referred
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText size={16} className="text-blue-500" />
            </div>
            <p className="text-sm text-gray-500">Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNaira(data.totalCollected)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {formatNaira(data.totalOutstanding)} outstanding
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign size={16} className="text-green-500" />
            </div>
            <p className="text-sm text-gray-500">Commissions paid</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNaira(data.totalCommissionsPaid)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {formatNaira(data.totalCommissionsDue)} due
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-500" />
            </div>
            <p className="text-sm text-gray-500">Collection rate</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.totalInvoiced > 0
              ? Math.round((data.totalCollected / data.totalInvoiced) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-2">
            of {formatNaira(data.totalInvoiced)} invoiced
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly sales chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-400" />
            Sales — last 6 months
          </h2>
          <div className="flex items-end gap-2 h-32">
            {data.monthlySales.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs font-medium text-gray-600">{m.count}</p>
                <div
                  className="w-full rounded-t-md bg-brand-500 transition-all min-h-[4px]"
                  style={{
                    height: `${Math.max((m.count / maxCount) * 100, 4)}%`,
                    opacity: m.count === 0 ? 0.2 : 1,
                  }}
                />
                <p className="text-xs text-gray-400 truncate w-full text-center">
                  {m.month.split(' ')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top listings */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            Top listings by sales
          </h2>
          {data.topListings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {data.topListings.map((l, i) => {
                const maxSales = data.topListings[0]?.sales_count ?? 1
                return (
                  <div key={l.id}>
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        href={`/listings/${l.id}`}
                        className="text-sm text-gray-700 hover:text-brand-500 truncate max-w-48"
                      >
                        {i + 1}. {l.title}
                      </Link>
                      <span className="text-sm font-medium text-gray-900 flex-shrink-0 ml-2">
                        {l.sales_count} sale{l.sales_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(l.sales_count / maxSales) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Partner leaderboard */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">Partner leaderboard</h2>
          <span className="text-xs text-gray-400 ml-auto">All time</span>
          <DownloadButton type="leaderboard" label="Export" />
        </div>

        {data.leaderboard.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No partner sales yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-12">
                  Rank
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Partner
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                  Sales
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                  Commission earned
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.leaderboard.map((p) => (
                <tr key={p.partner_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span
                      className={`text-sm font-bold ${
                        p.rank === 1
                          ? 'text-yellow-500'
                          : p.rank === 2
                          ? 'text-gray-400'
                          : p.rank === 3
                          ? 'text-orange-400'
                          : 'text-gray-300'
                      }`}
                    >
                      #{p.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/partners/${p.partner_id}`}
                      className="text-sm font-medium text-brand-500 hover:underline"
                    >
                      {p.full_name}
                    </Link>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {p.sales_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm font-medium text-green-600">
                      {formatNaira(p.commission_earned)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}