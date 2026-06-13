'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { SaleRow } from './page'
import { Search, ShoppingBag, ArrowUpDown } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending_deposit: 'bg-yellow-100 text-yellow-700',
  on_track: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  fully_paid: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}

const SOURCE_STYLES: Record<string, string> = {
  direct: 'bg-purple-100 text-purple-700',
  partner: 'bg-brand-100 text-brand-700',
}

type SortKey = 'registered_at' | 'full_name' | 'listing_title' | 'status'

type Props = {
  sales: SaleRow[]
  canManage: boolean
}

export function SalesClient({ sales, canManage }: Props) {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('registered_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = sales
    .filter((s) => {
      if (sourceFilter !== 'all' && s.source !== sourceFilter) return false
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.email?.toLowerCase().includes(q) ?? false) ||
          s.listing_title.toLowerCase().includes(q) ||
          (s.partner_name?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
    .sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  if (sales.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
        <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No sales yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Register your first sale to get started
        </p>
        {canManage && (
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Register sale
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, phone, listing…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All sources</option>
          <option value="direct">Direct</option>
          <option value="partner">Referred</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All statuses</option>
          <option value="pending_deposit">Pending deposit</option>
          <option value="on_track">On track</option>
          <option value="overdue">Overdue</option>
          <option value="fully_paid">Fully paid</option>
          <option value="defaulted">Defaulted</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="registered_at">Date registered</option>
          <option value="full_name">Name (A-Z)</option>
          <option value="listing_title">Listing</option>
          <option value="status">Status</option>
        </select>

        <button
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowUpDown size={15} className="text-gray-500" />
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {sales.length} sales
      </p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No sales match your search or filter
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Buyer
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Listing
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Source
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Partner
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/sales/${sale.id}`}
                >
                  {/* Buyer */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {sale.full_name}
                    </p>
                    <p className="text-xs text-gray-400">{sale.phone}</p>
                  </td>

                  {/* Listing */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/listings/${sale.listing_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-brand-500 hover:underline"
                    >
                      {sale.listing_title}
                    </Link>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        SOURCE_STYLES[sale.source] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {sale.source === 'partner' ? 'Referred' : 'Direct'}
                    </span>
                  </td>

                  {/* Partner */}
                  <td className="px-4 py-3">
                    {sale.partner_name ? (
                      <Link
                        href={`/partners/${sale.partner_company_id ?? sale.partner_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-brand-500 hover:underline"
                      >
                        {sale.partner_name}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[sale.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {sale.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {formatDate(sale.registered_at)}
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