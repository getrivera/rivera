'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatNaira, formatDate, initials } from '@/lib/utils'
import { updatePartnerStatus } from '@/actions/partners'
import type { PartnerRow } from './page'
import {
  Search, ArrowUpDown, Users,
  CheckCircle, Clock, Ban, Trash2
} from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-600',
  removed: 'bg-gray-100 text-gray-500',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  invited: Clock,
  active: CheckCircle,
  suspended: Ban,
  removed: Trash2,
}

type SortKey = 'joined_at' | 'full_name' | 'buyer_count' | 'commission_paid_kobo'

type Props = {
  partners: PartnerRow[]
  canManage: boolean
}

export function PartnersClient({ partners, canManage }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('joined_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState<string | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = partners
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
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

  async function handleStatusChange(
    partnerCompanyId: string,
    status: 'active' | 'suspended' | 'removed'
  ) {
    if (
      status === 'removed' &&
      !confirm('Remove this partner? They will lose access to your listings.')
    )
      return

    setLoading(partnerCompanyId)
    await updatePartnerStatus(partnerCompanyId, status)
    setLoading(null)
    router.refresh()
  }

  if (partners.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
        <Users size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No partners yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Invite your first partner to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name or email…"
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
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
          <option value="removed">Removed</option>
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="joined_at">Date joined</option>
          <option value="full_name">Name (A-Z)</option>
          <option value="buyer_count">Buyers registered</option>
          <option value="commission_paid_kobo">Commission earned</option>
        </select>

        <button
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown size={15} className="text-gray-500" />
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {partners.length} partners
      </p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No partners match your search or filter
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Status
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('buyer_count')}
                >
                  Buyers
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('commission_paid_kobo')}
                >
                  Commission paid
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('joined_at')}
                >
                  Joined
                </th>
                {canManage && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((partner) => {
                const StatusIcon = STATUS_ICONS[partner.status] ?? CheckCircle
                return (
                  <tr
                    key={partner.partner_company_id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/partners/${partner.partner_company_id}`)
                    }
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                          {partner.photo_url ? (
                            <img
                              src={partner.photo_url}
                              alt={partner.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initials(partner.full_name)
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {partner.full_name}
                        </p>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500">{partner.email}</p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_STYLES[partner.status] ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <StatusIcon size={10} />
                        {partner.status}
                      </span>
                    </td>

                    {/* Buyers */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {partner.buyer_count}
                      </span>
                    </td>

                    {/* Commission */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {formatNaira(partner.commission_paid_kobo)}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">
                        {formatDate(partner.joined_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          {partner.status === 'active' && (
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  partner.partner_company_id,
                                  'suspended'
                                )
                              }
                              disabled={loading === partner.partner_company_id}
                              className="text-xs text-orange-500 hover:text-orange-700 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}
                          {partner.status === 'suspended' && (
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  partner.partner_company_id,
                                  'active'
                                )
                              }
                              disabled={loading === partner.partner_company_id}
                              className="text-xs text-green-600 hover:text-green-700 disabled:opacity-50"
                            >
                              Reinstate
                            </button>
                          )}
                          {partner.status !== 'removed' && (
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  partner.partner_company_id,
                                  'removed'
                                )
                              }
                              disabled={loading === partner.partner_company_id}
                              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}