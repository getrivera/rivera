'use client'

import { useState, useMemo } from 'react'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from './page'
import { Shield, Search, X } from 'lucide-react'

type Props = { logs: AuditLog[] }

const ACTION_STYLES: Record<string, string> = {
  'sale.registered': 'bg-green-100 text-green-700',
  'invoice.created': 'bg-blue-100 text-blue-700',
  'invoice.sent': 'bg-blue-100 text-blue-700',
  'invoice.voided': 'bg-red-100 text-red-600',
  'invoice.payment_recorded': 'bg-green-100 text-green-700',
  'commission.approved': 'bg-purple-100 text-purple-700',
  'commission.paid': 'bg-green-100 text-green-700',
  'commission.failed': 'bg-red-100 text-red-600',
  'commission.returned': 'bg-orange-100 text-orange-600',
  'commission.processing': 'bg-blue-100 text-blue-700',
  'listing.created': 'bg-brand-100 text-brand-700',
  'listing.updated': 'bg-yellow-100 text-yellow-700',
  'listing.published': 'bg-green-100 text-green-700',
  'listing.archived': 'bg-gray-100 text-gray-500',
  'partner.invited': 'bg-blue-100 text-blue-700',
  'partner.activated': 'bg-green-100 text-green-700',
  'partner.suspended': 'bg-orange-100 text-orange-600',
  'partner.removed': 'bg-red-100 text-red-600',
  'staff.invited': 'bg-blue-100 text-blue-700',
  'staff.role_updated': 'bg-yellow-100 text-yellow-700',
  'staff.removed': 'bg-red-100 text-red-600',
}

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  sale: (id) => `/sales/${id}`,
  invoice: (id) => `/invoices/${id}`,
  commission: () => `/commissions`,
  listing: (id) => `/listings/${id}`,
  partner: (id) => `/partners/${id}`,
}

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 },
]

export function AuditClient({ logs }: Props) {
  const [dateRange, setDateRange] = useState(30)
  const [actionFilter, setActionFilter] = useState('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [performerFilter, setPerformerFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Derive unique filter options from logs
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action))).sort()
  }, [logs])

  const uniqueEntityTypes = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean))).sort() as string[]
  }, [logs])

  const uniquePerformers = useMemo(() => {
    return Array.from(
      new Map(
        logs
          .filter((l) => l.performed_by && l.performed_by_name)
          .map((l) => [l.performed_by, l.performed_by_name])
      ).entries()
    )
  }, [logs])

  const filtered = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - dateRange)

    return logs.filter((log) => {
      // Date range
      if (new Date(log.created_at) < cutoff) return false

      // Action
      if (actionFilter !== 'all' && log.action !== actionFilter) return false

      // Entity type
      if (entityTypeFilter !== 'all' && log.entity_type !== entityTypeFilter) return false

      // Performer
      if (performerFilter !== 'all' && log.performed_by !== performerFilter) return false

      // Search — matches entity label or entity id
      if (search) {
        const q = search.toLowerCase()
        const matchesLabel = log.entity_label?.toLowerCase().includes(q)
        const matchesId = log.entity_id?.toLowerCase().includes(q)
        const matchesPerformer = log.performed_by_name?.toLowerCase().includes(q)
        const matchesAction = log.action.toLowerCase().includes(q)
        if (!matchesLabel && !matchesId && !matchesPerformer && !matchesAction) return false
      }

      return true
    })
  }, [logs, dateRange, actionFilter, entityTypeFilter, performerFilter, search])

  const hasActiveFilters =
    dateRange !== 30 ||
    actionFilter !== 'all' ||
    entityTypeFilter !== 'all' ||
    performerFilter !== 'all' ||
    search !== ''

  function clearFilters() {
    setDateRange(30)
    setActionFilter('all')
    setEntityTypeFilter('all')
    setPerformerFilter('all')
    setSearch('')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, label or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Date range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {DATE_RANGE_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>{o.label}</option>
            ))}
          </select>

          {/* Action */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Entity type */}
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All resources</option>
            {uniqueEntityTypes.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>

          {/* Performer */}
          <select
            value={performerFilter}
            onChange={(e) => setPerformerFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All staff</option>
            {uniquePerformers.map(([id, name]) => (
              <option key={id} value={id ?? ''}>{name}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Showing {filtered.length} of {logs.length} entries
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <Shield size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No entries match your filters</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-brand-500 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Action</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Resource</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Performed by</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((log) => {
                const linkFn = log.entity_type ? ENTITY_LINKS[log.entity_type] : null
                const href = linkFn && log.entity_id ? linkFn(log.entity_id) : null

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    {/* Action */}
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-500'}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="px-5 py-3">
                      {log.entity_label && (
                        <p className="text-sm text-gray-700 font-medium">
                          {log.entity_label}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {log.entity_type && (
                          <span className="text-xs text-gray-400 capitalize">
                            {log.entity_type}
                          </span>
                        )}
                        {log.entity_id && (
                          <>
                            <span className="text-gray-200">·</span>
                            {href ? (
                              <a
                                href={href}
                                className="text-xs text-brand-500 hover:underline font-mono"
                              >
                                {log.entity_id.slice(0, 8)}…
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 font-mono">
                                {log.entity_id.slice(0, 8)}…
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Performed by */}
                    <td className="px-5 py-3">
                      <p className="text-sm text-gray-700">
                        {log.performed_by_name ?? '—'}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}