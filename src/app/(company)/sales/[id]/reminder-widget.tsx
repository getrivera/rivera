'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendManualReminder } from '@/actions/reminders'
import { Bell, Loader2 } from 'lucide-react'

type Template = {
  id: string
  name: string
  trigger_type: string
}

type Props = {
  saleId: string
  templates: Template[]
  canManage: boolean
}

export function ReminderWidget({ saleId, templates, canManage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>('sms')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canManage) {
    return <p className="text-sm text-gray-400">No permission</p>
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No active reminder templates.{' '}
        <a href="/settings" className="text-brand-500 hover:underline">
          Set up in Settings →
        </a>
      </p>
    )
  }

  function handleSend() {
    if (!templateId) return
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await sendManualReminder(saleId, templateId, channel)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && (
        <p className="text-xs text-green-600">Reminder sent successfully</p>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Template
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Channel
        </label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'sms' | 'email' | 'both')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="sms">SMS only</option>
          <option value="email">Email only</option>
          <option value="both">SMS + Email</option>
        </select>
      </div>

      <button
        onClick={handleSend}
        disabled={isPending || !templateId}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isPending ? (
          <><Loader2 size={14} className="animate-spin" /> Sending…</>
        ) : (
          <><Bell size={14} /> Send reminder</>
        )}
      </button>
    </div>
  )
}