'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteStaff, updateStaffRole } from '@/actions/settings'
import { UserPlus, Loader2, Check } from 'lucide-react'
import { ImportStaffModal } from './import-staff-modal'
import { AddUserModal } from './add-user-modal'
import { StaffDetailModal } from './staff-detail-modal'

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
  staff: StaffMember[]
  currentUserId: string
  currentUserRole: string
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access' },
  { value: 'manager', label: 'Manager', description: 'Everything except billing and staff' },
  { value: 'coordinator', label: 'Coordinator', description: 'Listings and sales only' },
  { value: 'finance', label: 'Finance', description: 'Invoices, commissions and sales' },
  { value: 'viewer', label: 'Viewer', description: 'Read only' },
]

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

export function StaffTab({ staff, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)

  const isAdmin = currentUserRole === 'admin'

  function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await inviteStaff(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setShowInvite(false)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  async function handleRoleChange(staffId: string, role: string) {
    setUpdatingId(staffId)
    const result = await updateStaffRole(staffId, role)
    if (!result.success) setError(result.error)
    else router.refresh()
    setUpdatingId(null)
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
          <Check size={14} /> Invite sent successfully
        </div>
      )}

      {/* Staff list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">
            Team members ({staff.length})
          </h3>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <ImportStaffModal />
              <AddUserModal />
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <UserPlus size={13} />
                Invite staff
              </button>
            </div>
          )}
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    name="full_name"
                    type="text"
                    placeholder="e.g. Ngozi Adeyemi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="staff@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a role</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isPending ? (
                    <><Loader2 size={13} className="animate-spin" /> Sending…</>
                  ) : (
                    'Send invite'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff list */}
        <div className="divide-y divide-gray-50">
          {staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <div
                onClick={() => isAdmin && setSelectedMember(member)}
                className={`flex items-center gap-3 ${isAdmin ? 'cursor-pointer group' : ''}`}
                title={isAdmin ? 'View account details' : undefined}
              >
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {member.full_name
                    ? member.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                    {member.full_name || member.email}
                    {member.user_id === currentUserId && (
                      <span className="ml-2 text-xs text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status */}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_STYLES[member.status] ?? 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {member.status}
                </span>

                {/* Role */}
                {isAdmin && member.user_id !== currentUserId ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    disabled={updatingId === member.id}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      ROLE_STYLES[member.role] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMember && (
        <StaffDetailModal
          member={selectedMember}
          isSelf={selectedMember.user_id === currentUserId}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Role reference */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-700 mb-3">Role permissions</p>
        <div className="space-y-2">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium w-24 text-center ${
                  ROLE_STYLES[r.value]
                }`}
              >
                {r.label}
              </span>
              <span className="text-xs text-gray-500">{r.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}