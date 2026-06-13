'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatNaira, formatDate } from '@/lib/utils'
import type { InvoiceRow } from './page'
import { Search, FileText } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-500',
}

type Props = {
  invoices: InvoiceRow[]
  canManage: boolean
}

export function InvoicesClient({ invoices, canManage }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.buyer_name.toLowerCase().includes(q) ||
        inv.listing_title.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (invoices.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
        <FileText size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No invoices yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Invoices are created automatically when a sale is registered
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by invoice number, buyer, listing…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {invoices.length} invoices
      </p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No invoices match your search or filter
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Invoice
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Buyer
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Listing
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Total
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Paid
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Balance
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
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-medium text-brand-500">
                      {inv.invoice_number}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/${inv.buyer_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-gray-700 hover:text-brand-500"
                    >
                      {inv.buyer_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-500 truncate max-w-40">
                      {inv.listing_title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {formatNaira(inv.total_kobo)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">
                      {formatNaira(inv.amount_paid_kobo)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className={`text-sm font-medium ${
                        inv.status === 'voided'
                          ? 'text-gray-400'
                          : inv.total_kobo - inv.amount_paid_kobo > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatNaira(Math.max(0, inv.total_kobo - inv.amount_paid_kobo))}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-400">
                      {formatDate(inv.created_at)}
                    </p>
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