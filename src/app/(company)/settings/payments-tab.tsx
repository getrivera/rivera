'use client'

import { useState, useTransition } from 'react'
import { savePaystackConfig, disconnectPaystackConfig } from '@/actions/paystack-config'
import { Check, Loader2, ShieldCheck, AlertCircle, Unlink, ExternalLink } from 'lucide-react'

type PaystackConfig = {
  id: string
  paystack_secret_key: string
  paystack_public_key: string | null
  business_name: string | null
  is_active: boolean
  connected_at: string
} | null

type Props = {
  config: PaystackConfig
  isAdmin: boolean
}

function maskKey(key: string): string {
  if (!key) return ''
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)
}

export function PaymentsTab({ config, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [editMode, setEditMode] = useState(!config)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await savePaystackConfig(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setEditMode(false)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  function handleDisconnect() {
    setError(null)
    startTransition(async () => {
      const result = await disconnectPaystackConfig()
      if (!result.success) {
        setError(result.error)
        return
      }
      setShowDisconnectConfirm(false)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">Paystack integration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your Paystack account to enable virtual accounts and automated commission payouts.
          Payments go directly to your Paystack balance — Rivera never holds your money.
        </p>
      </div>

      {/* Connected state */}
      {config && !editMode ? (
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 mb-1">
                Paystack connected
              </p>
              {config.business_name && (
                <p className="text-sm text-green-700 mb-2">{config.business_name}</p>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium w-24">Secret key</span>
                  <span className="text-xs font-mono text-green-800 bg-green-100 px-2 py-0.5 rounded">
                    {maskKey(config.paystack_secret_key)}
                  </span>
                </div>
                {config.paystack_public_key && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium w-24">Public key</span>
                    <span className="text-xs font-mono text-green-800 bg-green-100 px-2 py-0.5 rounded">
                      {maskKey(config.paystack_public_key)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium w-24">Connected</span>
                  <span className="text-xs text-green-700">
                    {new Date(config.connected_at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Update keys
              </button>
              {!showDisconnectConfirm ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Unlink size={14} />
                  Disconnect
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-red-600">Are you sure?</p>
                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : 'Yes, disconnect'}
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(false)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Not connected or edit mode
        <div className="space-y-4">
          {!config && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <AlertCircle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Paystack not connected
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Virtual accounts and automated commission payouts require your Paystack account.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              <Check size={14} />
              Paystack connected successfully
            </div>
          )}

          {isAdmin ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret key <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    Starts with sk_live_ or sk_test_
                  </span>
                </label>
                <input
                  name="paystack_secret_key"
                  type="password"
                  required
                  placeholder="sk_live_••••••••••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Found in your Paystack dashboard under Settings → API Keys
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Public key
                  <span className="ml-2 text-xs text-gray-400 font-normal">Optional</span>
                </label>
                <input
                  name="paystack_public_key"
                  type="text"
                  placeholder="pk_live_••••••••••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business name
                  <span className="ml-2 text-xs text-gray-400 font-normal">Optional</span>
                </label>
                <input
                  name="business_name"
                  type="text"
                  placeholder="As registered on Paystack"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                  ) : success ? (
                    <><Check size={14} /> Connected!</>
                  ) : 'Connect Paystack'}
                </button>
                {editMode && config && (
                  <button
                    type="button"
                    onClick={() => { setEditMode(false); setError(null) }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <a
                href="https://dashboard.paystack.com/#/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline"
              >
                <ExternalLink size={11} />
                Open Paystack dashboard
              </a>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              Only admins can connect a Paystack account.
            </p>
          )}
        </div>
      )}

      {/* What this enables */}
      <div className="border-t border-gray-100 pt-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          What connecting Paystack enables
        </p>
        <div className="space-y-2">
          {[
            'Dedicated virtual accounts for each buyer',
            'Automatic payment recording when buyers pay',
            'Automated commission payouts to partners',
            'Transfer history and reconciliation in Rivera',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check size={10} className="text-green-600" />
              </div>
              <p className="text-xs text-gray-600">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}