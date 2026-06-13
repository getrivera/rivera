'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createInvoice } from '@/actions/invoices'
import { formatNaira } from '@/lib/utils'
import { FileText, Loader2, Plus } from 'lucide-react'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_kobo: number
  amount_paid_kobo: number
} | null

type Props = {
  saleId: string
  invoice: Invoice
  canManage: boolean
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-500',
}

export function InvoiceWidget({ saleId, invoice, canManage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    startTransition(async () => {
      const result = await createInvoice(saleId)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  if (!invoice) {
    return (
      <div className="space-y-3">
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <p className="text-sm text-gray-400">No invoice yet</p>
        {canManage && (
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Generate invoice
          </button>
        )}
      </div>
    )
  }

  const balance = invoice.total_kobo - invoice.amount_paid_kobo

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/invoices/${invoice.id}`}
          className="flex items-center gap-2 text-sm font-mono font-medium text-brand-500 hover:underline"
        >
          <FileText size={14} />
          {invoice.invoice_number}
        </Link>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-500'
          }`}
        >
          {invoice.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-medium">{formatNaira(invoice.total_kobo)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Paid</span>
          <span className="font-medium text-green-600">
            {formatNaira(invoice.amount_paid_kobo)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Balance</span>
          <span className={`font-medium ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {formatNaira(balance)}
          </span>
        </div>
      </div>

      <Link
        href={`/invoices/${invoice.id}`}
        className="block text-xs text-brand-500 hover:underline"
      >
        View full invoice →
      </Link>
    </div>
  )
}