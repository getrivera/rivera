'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { invitePartnerByEmail } from '@/actions/partners'
import { UserPlus, X, Copy, Check } from 'lucide-react'

type Props = {
  companyCode: string
}

export function InvitePartnerModal({ companyCode }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'email' | 'link' | 'code'>('email')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : ''
  const inviteLink = `https://${hostname}/invite?code=${companyCode}`

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await invitePartnerByEmail(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <UserPlus size={16} />
        Invite partner
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Invite a partner</h2>
              <button
                onClick={() => {
                  setOpen(false)
                  setError(null)
                  setSuccess(false)
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(['email', 'link', 'code'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
                    tab === t
                      ? 'border-brand-500 text-brand-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'email'
                    ? 'Email invite'
                    : t === 'link'
                    ? 'Invite link'
                    : 'Company code'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Email tab */}
              {tab === 'email' && (
                <>
                  {success ? (
                    <div className="text-center py-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <Check size={20} className="text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        Invite sent!
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        They can join using the company code
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                          {error}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Partner name
                        </label>
                        <input
                          name="name"
                          type="text"
                          placeholder="e.g. Amaka Obi"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email address <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="partner@email.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {isPending ? 'Sending…' : 'Send invite'}
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* Link tab */}
              {tab === 'link' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Share this link with anyone you want to join your partner
                    network. They will be asked to create an account if they
                    don&apos;t have one.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteLink)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-green-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Code tab */}
              {tab === 'code' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Partners can enter this code when signing up to join your
                    network directly.
                  </p>
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-3xl font-bold font-mono tracking-widest text-brand-500">
                      {companyCode}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Company code</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(companyCode)}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-green-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy code
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Partners enter this code on the partner signup page
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}