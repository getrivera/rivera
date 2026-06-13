'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { sendInvoice, resendInvoice, voidInvoice, recordPayment } from '@/actions/invoices'
import { MoneyInput } from '@/components/ui/money-input'
import { ChevronDown, Loader2, X } from 'lucide-react'

type Props = {
  invoiceId: string
  currentStatus: string
}

export function InvoiceActions({ invoiceId, currentStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentRef, setPaymentRef] = useState('')

  const [showVoid, setShowVoid] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Escape closes the dropdown and any open modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setShowPayment(false)
        setShowVoid(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSend() {
    setOpen(false)
    setError(null)
    setInfo(null)
    startTransition(async () => {
      const result = await sendInvoice(invoiceId)
      if (!result.success) {
        setError(result.error)
        return
      }
      const data = result.data as { emailSent?: boolean; message?: string } | undefined
      if (data?.message) setInfo(data.message)
      router.refresh()
    })
  }

  function handleResend() {
    setOpen(false)
    setError(null)
    setInfo(null)
    startTransition(async () => {
      const result = await resendInvoice(invoiceId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setInfo('Invoice email re-sent to the buyer')
      router.refresh()
    })
  }

  function handleRecordPayment() {
    // paymentAmount is the raw numeric string from MoneyInput (commas stripped)
    const amount = parseFloat(paymentAmount)
    if (!paymentAmount || isNaN(amount) || amount <= 0) return
    setShowPayment(false)
    setError(null)
    setInfo(null)
    startTransition(async () => {
      const result = await recordPayment(
        invoiceId,
        amount,
        paymentRef || `MANUAL-${Date.now()}`
      )
      if (!result.success) setError(result.error)
      else router.refresh()
    })
  }

  function handleVoid() {
    if (!voidReason.trim()) return
    setShowVoid(false)
    startTransition(async () => {
      const result = await voidInvoice(invoiceId, voidReason)
      if (!result.success) setError(result.error)
      else router.refresh()
    })
  }

  const isVoided = currentStatus === 'voided'

  return (
    <>
      {error && <p className="text-xs text-red-500 mb-2 text-right">{error}</p>}
      {info && <p className="text-xs text-green-600 mb-2 text-right">{info}</p>}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          disabled={isPending || isVoided}
          className="flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              Actions
              <ChevronDown size={14} />
            </>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {currentStatus === 'draft' && (
              <button
                onClick={handleSend}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Send to buyer
              </button>
            )}
            {['sent', 'partially_paid', 'paid'].includes(currentStatus) && (
              <button
                onClick={handleResend}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Resend invoice
              </button>
            )}
            {['draft', 'sent', 'partially_paid'].includes(currentStatus) && (
              <button
                onClick={() => { setOpen(false); setShowPayment(true) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Record payment
              </button>
            )}
            {currentStatus !== 'paid' && (
              <button
                onClick={() => { setOpen(false); setShowVoid(true) }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
              >
                Void invoice
              </button>
            )}
          </div>
        )}
      </div>

      {/* Record payment modal */}
      {showPayment && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPayment(false) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Record payment</h3>
              <button onClick={() => setShowPayment(false)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₦) <span className="text-red-500">*</span>
                </label>
                <MoneyInput
                  value={paymentAmount}
                  onValueChange={setPaymentAmount}
                  placeholder="e.g. 500,000"
                  prefix="₦"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment reference
                  <span className="ml-1 text-xs text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. bank transfer ref"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void modal */}
      {showVoid && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowVoid(false) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Void invoice</h3>
              <button onClick={() => setShowVoid(false)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              This cannot be undone. Please provide a reason.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="e.g. Sale cancelled by buyer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowVoid(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={!voidReason.trim()}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                Void
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}