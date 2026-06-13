'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Calendar, ChevronDown, Loader2 } from 'lucide-react'

export type Period = 'today' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom'

export const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  last_7: 'Last 7 days',
  last_30: 'Last 30 days',
  this_month: 'This month',
  last_month: 'Last month',
  this_year: 'This year',
  all_time: 'All time',
  custom: 'Custom range',
}

const PERIODS: Period[] = [
  'today', 'last_7', 'last_30', 'this_month',
  'last_month', 'this_year', 'all_time', 'custom',
]

type Props = {
  current: Period
  from?: string
  to?: string
}

export function PeriodSelector({ current, from, to }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  function setPeriod(period: Period) {
    if (period === 'custom') {
      setShowCustom(true)
      setOpen(false)
      return
    }
    setOpen(false)
    const params = new URLSearchParams()
    params.set('period', period)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const params = new URLSearchParams()
    params.set('period', 'custom')
    params.set('from', customFrom)
    params.set('to', customTo)
    setShowCustom(false)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const label = current === 'custom' && from && to
    ? `${from} → ${to}`
    : PERIOD_LABELS[current]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-70 transition-all"
      >
        {isPending
          ? <Loader2 size={14} className="text-brand-500 animate-spin" />
          : <Calendar size={14} className="text-gray-400" />
        }
        <span>{label}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  current === p && p !== 'custom'
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Custom date picker */}
      {showCustom && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowCustom(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4">
            <p className="text-xs font-medium text-gray-700 mb-3">Custom date range</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo || isPending}
                  className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowCustom(false)}
                  className="flex-1 py-2 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}