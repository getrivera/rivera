'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updatePartnerStatus } from '@/actions/partners'
import { ChevronDown, Loader2 } from 'lucide-react'

type Props = {
  partnerCompanyId: string
  currentStatus: string
}

export function PartnerStatusActions({ partnerCompanyId, currentStatus }: Props) {
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

  async function handleAction(status: 'active' | 'suspended' | 'removed') {
    setOpen(false)
    if (
      status === 'removed' &&
      !confirm('Remove this partner? They will lose access to your listings.')
    )
      return

    startTransition(async () => {
      const result = await updatePartnerStatus(partnerCompanyId, status)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (status === 'removed') {
        router.push('/partners')
      } else {
        router.refresh()
      }
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
            Manage partner
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          {currentStatus !== 'active' && (
            <button
              onClick={() => handleAction('active')}
              className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-gray-50 transition-colors"
            >
              Set as active
            </button>
          )}
          {currentStatus === 'active' && (
            <button
              onClick={() => handleAction('suspended')}
              className="w-full text-left px-4 py-2.5 text-sm text-orange-500 hover:bg-gray-50 transition-colors"
            >
              Suspend
            </button>
          )}
          {currentStatus === 'suspended' && (
            <button
              onClick={() => handleAction('active')}
              className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-gray-50 transition-colors"
            >
              Reinstate
            </button>
          )}
          <button
            onClick={() => handleAction('removed')}
            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            Remove partner
          </button>
        </div>
      )}
    </div>
  )
}