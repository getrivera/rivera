'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateSaleStatus } from '@/actions/sales'
import { ChevronDown, Loader2 } from 'lucide-react'

type Props = {
  saleId: string
  currentStatus: string
}

const STATUS_OPTIONS = [
  { value: 'pending_deposit', label: 'Pending deposit' },
  { value: 'on_track', label: 'On track' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'fully_paid', label: 'Fully paid' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function SaleActions({ saleId, currentStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  function handleStatusChange(status: string) {
    setOpen(false)
    startTransition(async () => {
      const result = await updateSaleStatus(saleId, status)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            Update status
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          {STATUS_OPTIONS.filter((s) => s.value !== currentStatus).map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}