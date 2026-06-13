'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBuyerVirtualAccount } from '@/actions/virtual-accounts'
import { formatNaira, formatDate } from '@/lib/utils'
import { CreditCard, Copy, Check, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { DemoTransaction } from '@/lib/va-demo'

type VA = {
  id?: string
  account_number: string
  account_name: string
  bank_name: string
  is_active: boolean
  is_demo?: boolean
}

type RealTransaction = {
  id: string
  amount_kobo: number
  narration: string | null
  paystack_reference: string
  paid_at: string | null
  created_at: string
}

type Props = {
  saleId: string
  va: VA | null
  transactions: RealTransaction[] | DemoTransaction[]
  canManage: boolean
  vaEnabled: boolean
  hasPaystack: boolean
  demoMode?: boolean
}

export function VAWidget({
  saleId,
  va,
  transactions,
  canManage,
  vaEnabled,
  hasPaystack,
  demoMode = false,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedBank, setSelectedBank] = useState<'wema-bank' | 'titan-paystack'>('wema-bank')

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createBuyerVirtualAccount(saleId, selectedBank)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  // Not enabled at all
  if (!vaEnabled && !hasPaystack && !demoMode) {
    return (
      <div className="text-center py-4 space-y-2">
        <CreditCard size={24} className="mx-auto text-gray-300" />
        <p className="text-xs text-gray-400">Virtual accounts not enabled</p>
        {canManage && (
          <Link
            href="/settings"
            className="text-xs text-brand-500 hover:underline block"
          >
            Connect Paystack in Settings →
          </Link>
        )}
      </div>
    )
  }

  // No VA yet — show create form
  if (!va) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">No virtual account assigned yet.</p>
        {canManage && (hasPaystack || vaEnabled) && !demoMode && (
          <>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Preferred bank
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value as typeof selectedBank)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="wema-bank">Wema Bank (ALAT)</option>
                <option value="titan-paystack">Titan Trust Bank</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Creating…</>
              ) : (
                <><CreditCard size={14} /> Create virtual account</>
              )}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Demo badge */}
      {demoMode && (
        <div className="px-2 py-1 bg-yellow-100 border border-yellow-200 rounded-lg text-xs text-yellow-700 font-medium text-center">
          Demo mode — sample account
        </div>
      )}

      {/* VA details */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">
            {va.bank_name}
          </p>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
            Active
          </span>
        </div>

        <div>
          <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
            {va.account_number}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">{va.account_name}</p>
        </div>

        <button
          onClick={() => copyToClipboard(va.account_number)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-brand-200 rounded-lg text-sm text-brand-600 hover:bg-brand-50 transition-colors"
        >
          {copied ? (
            <><Check size={13} /> Copied!</>
          ) : (
            <><Copy size={13} /> Copy account number</>
          )}
        </button>
      </div>

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">Payment history</p>
          <div className="flex items-center gap-2">
            <Link
              href={`/virtual-accounts/${saleId}`}
              className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
            >
              <ExternalLink size={11} />
              View all
            </Link>
            {!demoMode && (
              <button
                onClick={() => router.refresh()}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
            )}
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">
            No payments received yet
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-600">
                    +{formatNaira(tx.amount_kobo)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tx.narration ?? tx.paystack_reference}
                  </p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {tx.paid_at
                    ? formatDate(tx.paid_at)
                    : formatDate(tx.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}