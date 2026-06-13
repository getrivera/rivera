'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatNaira, formatDate } from '@/lib/utils'
import {
  approveCommission,
  declineCommission,
  markCommissionProcessing,
  markCommissionPaid,
  markCommissionFailed,
} from '@/actions/commissions'
import type { CommissionRow, CommissionEvent } from './page'
import {
  Search,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  XCircle,
  History,
} from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  due: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  returned: 'bg-orange-100 text-orange-600',
  declined: 'bg-red-50 text-red-500',
  clawed_back: 'bg-gray-100 text-gray-400',
}

const EVENT_LABELS: Record<string, string> = {
  approved: 'Approved',
  reapproved: 'Re-approved',
  declined: 'Declined',
  processing: 'Marked processing',
  paid: 'Marked paid',
  failed: 'Marked failed',
  returned: 'Marked returned',
}

const TRIGGER_LABELS: Record<string, string> = {
  on_deposit: 'On deposit',
  per_installment: 'Per installment',
  on_full_payment: 'On full payment',
  on_milestone: 'On milestone',
  deposit_received: 'Deposit received',
  fully_paid: 'Fully paid',
  installment_paid: 'Installment paid',
  milestone_reached: 'Milestone reached',
}

const STATUS_FLOW: Record<string, string> = {
  due: 'Approve or Decline → Processing → Paid',
  approved: 'Processing → Paid (or Decline)',
  processing: 'Mark Paid or Failed',
  declined: 'Can be re-approved if circumstances change',
}

type ConfirmAction = {
  type: 'approve' | 'decline' | 'processing' | 'paid' | 'failed' | 'returned'
  commissionId: string
  partnerName: string
  amount: number
}

type Props = {
  commissions: CommissionRow[]
  canManage: boolean
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({
  action,
  onClose,
  onConfirm,
  isPending,
}: {
  action: ConfirmAction
  onClose: () => void
  onConfirm: (transferRef?: string, note?: string) => void
  isPending: boolean
}) {
  const [transferRef, setTransferRef] = useState('')
  const [note, setNote] = useState('')

  const isDestructive = ['failed', 'returned', 'decline'].includes(action.type)
  const needsRef = action.type === 'processing'
  const needsNote = isDestructive
  const noteValid = !needsNote || note.trim().length >= 5

  const LABELS: Record<string, { title: string; desc: string; btn: string; btnClass: string }> = {
    approve: {
      title: 'Approve commission',
      desc: `Approve ${formatNaira(action.amount)} commission for ${action.partnerName}. This will move it to approved status ready for processing.`,
      btn: 'Approve',
      btnClass: 'bg-blue-500 hover:bg-blue-600',
    },
    processing: {
      title: 'Mark as processing',
      desc: `Confirm that ${formatNaira(action.amount)} is being transferred to ${action.partnerName}. Add a transfer reference if available.`,
      btn: 'Mark processing',
      btnClass: 'bg-purple-500 hover:bg-purple-600',
    },
    paid: {
      title: 'Mark as paid',
      desc: `Confirm that ${formatNaira(action.amount)} has been successfully paid to ${action.partnerName}. This action cannot be undone.`,
      btn: 'Confirm paid',
      btnClass: 'bg-green-500 hover:bg-green-600',
    },
    failed: {
      title: 'Mark as failed',
      desc: `Mark the ${formatNaira(action.amount)} commission to ${action.partnerName} as failed. You can re-approve it later.`,
      btn: 'Mark failed',
      btnClass: 'bg-red-500 hover:bg-red-600',
    },
    returned: {
      title: 'Mark as returned',
      desc: `Mark the ${formatNaira(action.amount)} commission to ${action.partnerName} as returned. Funds were sent back.`,
      btn: 'Mark returned',
      btnClass: 'bg-orange-500 hover:bg-orange-600',
    },
    decline: {
      title: 'Decline commission',
      desc: `Decline the ${formatNaira(action.amount)} commission for ${action.partnerName}. A note explaining the decision is required — it will be visible in the commission history.`,
      btn: 'Decline',
      btnClass: 'bg-red-500 hover:bg-red-600',
    },
  }

  const config = LABELS[action.type]

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{config.title}</h3>
          <button onClick={onClose}>
            <X size={16} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{config.desc}</p>

        {needsRef && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer reference
              <span className="ml-1 text-xs text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={transferRef}
              onChange={(e) => setTransferRef(e.target.value)}
              placeholder="e.g. bank transfer ref"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {needsNote && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={
                action.type === 'failed'
                  ? 'e.g. Invalid account number'
                  : action.type === 'returned'
                  ? 'e.g. Account closed, funds returned'
                  : 'e.g. Sale cancelled by buyer — commission not payable'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            {!noteValid && note.length > 0 && (
              <p className="text-xs text-red-500 mt-1">Please write at least 5 characters</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(transferRef, note)}
            disabled={isPending || !noteValid}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${config.btnClass}`}
          >
            {isPending ? (
              <><Loader2 size={13} className="animate-spin" /> Processing…</>
            ) : config.btn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Expanded commission row ───────────────────────────────────────────────────

function CommissionRow({
  commission,
  canManage,
  onAction,
}: {
  commission: CommissionRow
  canManage: boolean
  onAction: (action: ConfirmAction) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const { status } = commission
  const canApprove = ['due', 'failed', 'returned', 'declined'].includes(status)
  const canDecline = ['due', 'approved'].includes(status)
  const canProcess = status === 'approved'
  const canMarkPaid = status === 'processing'
  const canMarkFailed = status === 'processing'
  const hasActions = canManage && (canApprove || canDecline || canProcess || canMarkPaid || canMarkFailed)

  return (
    <>
      {/* Main row */}
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded
              ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
              : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            }
            <div>
              <p className="text-sm font-medium text-gray-900">{commission.partner_name}</p>
              <p className="text-xs text-gray-400 font-mono">{commission.id.slice(0, 8)}…</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700">{commission.buyer_name}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-500 truncate max-w-32">{commission.listing_title}</p>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">
            {formatNaira(commission.amount_kobo)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-gray-500">
            {TRIGGER_LABELS[commission.trigger_event] ?? commission.trigger_event}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            STATUS_STYLES[commission.status] ?? 'bg-gray-100 text-gray-500'
          }`}>
            {commission.status.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-gray-400">
            {commission.triggered_at ? formatDate(commission.triggered_at) : '—'}
          </span>
        </td>
      </tr>

      {/* Expanded panel */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-4 bg-gray-50 border-b border-gray-100">
            <div className="rounded-xl border border-gray-200 bg-white p-5 mt-1 space-y-4">
              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Commission ID</p>
                  <p className="text-xs font-mono text-gray-700">{commission.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Amount</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatNaira(commission.amount_kobo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Trigger</p>
                  <p className="text-sm text-gray-700">
                    {TRIGGER_LABELS[commission.trigger_event] ?? commission.trigger_event}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_STYLES[commission.status] ?? 'bg-gray-100 text-gray-500'
                  }`}>
                    {commission.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Partner</p>
                  <Link
                    href={`/partners/${commission.partner_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-brand-500 hover:underline"
                  >
                    {commission.partner_name}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Buyer / Sale</p>
                  <Link
                    href={`/sales/${commission.buyer_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-brand-500 hover:underline"
                  >
                    {commission.buyer_name}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Listing</p>
                  <Link
                    href={`/listings/${commission.listing_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-brand-500 hover:underline"
                  >
                    {commission.listing_title}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Triggered</p>
                  <p className="text-sm text-gray-700">
                    {commission.triggered_at ? formatDate(commission.triggered_at) : '—'}
                  </p>
                </div>
                {commission.paid_at && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Paid</p>
                    <p className="text-sm text-gray-700">{formatDate(commission.paid_at)}</p>
                  </div>
                )}
              </div>

              {/* Decline / failure note */}
              {commission.status_note && ['declined', 'failed', 'returned'].includes(commission.status) && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-600 mb-0.5 capitalize">
                    {commission.status.replace(/_/g, ' ')} — note
                  </p>
                  <p className="text-sm text-red-700">{commission.status_note}</p>
                </div>
              )}

              {/* Status history */}
              {commission.events.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                    <History size={12} />
                    History
                  </p>
                  <div className="space-y-2">
                    {commission.events.map((event: CommissionEvent) => (
                      <div key={event.id} className="flex items-start gap-2 text-xs">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-gray-700">
                            <span className="font-medium">
                              {EVENT_LABELS[event.event_type] ?? event.event_type}
                            </span>
                            {event.performed_by_name && (
                              <span className="text-gray-400"> by {event.performed_by_name}</span>
                            )}
                            <span className="text-gray-400"> · {formatDate(event.created_at)}</span>
                          </p>
                          {event.note && (
                            <p className="text-gray-500 mt-0.5 break-words">“{event.note}”</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status flow */}
              {STATUS_FLOW[commission.status] && (
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <ArrowRight size={11} />
                  <span>Next steps: {STATUS_FLOW[commission.status]}</span>
                </div>
              )}

              {/* Action buttons */}
              {hasActions && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {canApprove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAction({
                          type: 'approve',
                          commissionId: commission.id,
                          partnerName: commission.partner_name,
                          amount: commission.amount_kobo,
                        })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <CheckCircle size={12} />
                      {commission.status === 'due' ? 'Approve' : 'Re-approve'}
                    </button>
                  )}
                  {canDecline && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAction({
                          type: 'decline',
                          commissionId: commission.id,
                          partnerName: commission.partner_name,
                          amount: commission.amount_kobo,
                        })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <XCircle size={12} />
                      Decline
                    </button>
                  )}
                  {canProcess && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAction({
                          type: 'processing',
                          commissionId: commission.id,
                          partnerName: commission.partner_name,
                          amount: commission.amount_kobo,
                        })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <ArrowRight size={12} />
                      Mark processing
                    </button>
                  )}
                  {canMarkPaid && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAction({
                          type: 'paid',
                          commissionId: commission.id,
                          partnerName: commission.partner_name,
                          amount: commission.amount_kobo,
                        })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle size={12} />
                      Mark as paid
                    </button>
                  )}
                  {canMarkFailed && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction({
                            type: 'failed',
                            commissionId: commission.id,
                            partnerName: commission.partner_name,
                            amount: commission.amount_kobo,
                          })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <AlertCircle size={12} />
                        Mark as failed
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction({
                            type: 'returned',
                            commissionId: commission.id,
                            partnerName: commission.partner_name,
                            amount: commission.amount_kobo,
                          })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <AlertCircle size={12} />
                        Mark as returned
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommissionsClient({ commissions, canManage }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = commissions.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.partner_name.toLowerCase().includes(q) ||
        c.listing_title.toLowerCase().includes(q) ||
        c.buyer_name.toLowerCase().includes(q)
      )
    }
    return true
  })

  function handleConfirm(transferRef?: string, note?: string) {
    if (!pendingAction) return
    setActionError(null)

    startTransition(async () => {
      let result

      if (pendingAction.type === 'approve') {
        result = await approveCommission(pendingAction.commissionId)
      } else if (pendingAction.type === 'decline') {
        result = await declineCommission(pendingAction.commissionId, note ?? '')
      } else if (pendingAction.type === 'processing') {
        result = await markCommissionProcessing(
          pendingAction.commissionId,
          transferRef || `TRF-${Date.now()}`
        )
      } else if (pendingAction.type === 'paid') {
        result = await markCommissionPaid(pendingAction.commissionId)
      } else if (pendingAction.type === 'failed') {
        result = await markCommissionFailed(pendingAction.commissionId, 'failed', note ?? '')
      } else if (pendingAction.type === 'returned') {
        result = await markCommissionFailed(pendingAction.commissionId, 'returned', note ?? '')
      }

      if (result && !result.success) {
        setActionError(result.error)
        return
      }

      setPendingAction(null)
      router.refresh()
    })
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
        <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No commissions yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Commissions appear here when referred sales are registered
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by partner, listing, buyer…"
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
          <option value="pending">Pending</option>
          <option value="due">Due</option>
          <option value="approved">Approved</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="returned">Returned</option>
          <option value="declined">Declined</option>
          <option value="clawed_back">Clawed back</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {commissions.length} commissions
      </p>

      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No commissions match your search or filter
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Partner</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Buyer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Listing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Trigger</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <CommissionRow
                  key={c.id}
                  commission={c}
                  canManage={canManage}
                  onAction={setPendingAction}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation modal */}
      {pendingAction && (
        <ConfirmModal
          action={pendingAction}
          onClose={() => { setPendingAction(null); setActionError(null) }}
          onConfirm={handleConfirm}
          isPending={isPending}
        />
      )}
    </div>
  )
}