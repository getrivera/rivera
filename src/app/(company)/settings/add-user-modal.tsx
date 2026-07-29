'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Loader2, Check, Copy, AlertCircle } from 'lucide-react'
import { createStaffDirect } from '@/actions/settings'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'finance', label: 'Finance' },
  { value: 'viewer', label: 'Viewer' },
]

export function AddUserModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setError(null)
    setResult(null)
    setCopied(false)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(reset, 300)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    startTransition(async () => {
      const res = await createStaffDirect(formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setResult({ email, tempPassword: res.data.tempPassword })
      router.refresh()
    })
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <UserPlus size={13} />
        Add user
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Add user</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Creates the account immediately with a temporary password —
                  no email is sent
                </p>
              </div>
              <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5">
              {!result ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}

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
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
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
                        <><Loader2 size={13} className="animate-spin" /> Creating…</>
                      ) : (
                        'Create account'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <Check size={16} />
                    Account created for {result.email}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Temporary password
                    </p>
                    <p className="text-xs text-gray-400 mb-2">
                      Share this with them directly — it won&apos;t be shown again.
                      They&apos;ll be asked to set their own password on first login.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-900">
                        {result.tempPassword}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Copy password"
                      >
                        {copied ? (
                          <Check size={14} className="text-green-600" />
                        ) : (
                          <Copy size={14} className="text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}