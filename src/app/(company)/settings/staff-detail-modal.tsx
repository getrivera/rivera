'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, KeyRound, Trash2, Check, AlertCircle } from 'lucide-react'
import { getStaffAuthDetails, resetStaffPassword, removeStaff } from '@/actions/settings'
import { formatDateTime, formatRelativeTime, initials } from '@/lib/utils'

type StaffMember = {
  id: string
  user_id: string
  role: string
  status: string
  created_at: string
  full_name: string
  email: string
}

type Props = {
  member: StaffMember
  isSelf: boolean
  onClose: () => void
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  coordinator: 'bg-green-100 text-green-700',
  finance: 'bg-yellow-100 text-yellow-700',
  viewer: 'bg-gray-100 text-gray-600',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  invited: 'bg-yellow-100 text-yellow-700',
}

export function StaffDetailModal({ member, isSelf, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<{ lastSignInAt: string | null; signInMethod: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStaffAuthDetails(member.id).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.error)
      } else {
        setDetails(result.data)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [member.id])

  async function handleResetPassword() {
    if (!confirm(`Send a password reset link to ${member.email}?`)) return
    setActionPending(true)
    const result = await resetStaffPassword(member.id)
    if (!result.success) {
      setError(result.error)
    } else {
      setResetSent(true)
    }
    setActionPending(false)
  }

  async function handleRemove() {
    if (!confirm('Remove this staff member? They will lose access immediately.')) return
    setActionPending(true)
    const result = await removeStaff(member.id)
    if (!result.success) {
      setError(result.error)
      setActionPending(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {member.full_name ? initials(member.full_name) : '?'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {member.full_name || member.email}
                {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
              </p>
              <p className="text-xs text-gray-400">{member.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                ROLE_STYLES[member.role] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {member.role}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                STATUS_STYLES[member.status] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {member.status}
            </span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Member since</span>
              <span className="text-gray-900 font-medium">{formatDateTime(member.created_at)}</span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
                <Loader2 size={13} className="animate-spin" /> Loading account details…
              </div>
            ) : details ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Last login</span>
                  <span className="text-gray-900 font-medium">
                    {details.lastSignInAt ? formatRelativeTime(details.lastSignInAt) : 'Never signed in'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Sign-in method</span>
                  <span className="text-gray-900 font-medium">{details.signInMethod}</span>
                </div>
              </>
            ) : null}
          </div>

          {!isSelf && (
            <div className="space-y-2 pt-1">
              {resetSent ? (
                <div className="flex items-center gap-2 text-sm text-green-600 px-1">
                  <Check size={14} /> Password reset link sent
                </div>
              ) : (
                <button
                  onClick={handleResetPassword}
                  disabled={actionPending}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                >
                  {actionPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Send password reset
                </button>
              )}

              <button
                onClick={handleRemove}
                disabled={actionPending}
                className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
              >
                {actionPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Remove staff member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}