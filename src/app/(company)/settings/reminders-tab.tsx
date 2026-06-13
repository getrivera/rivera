'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateReminderSettings, updateReminderTemplate, updateEmailDomainSettings } from '@/actions/reminders'
import { Check, Loader2, Bell, BellOff, Mail, Globe, ShieldCheck, AlertCircle, Copy } from 'lucide-react'
import { resolveFromAddress } from '@/lib/email-config-utils'

type Template = {
  id: string
  name: string
  trigger_type: string
  days_offset: number
  message_template: string
  is_active: boolean
  channel: 'sms' | 'email' | 'both'
}

type Company = {
  name: string
  slug: string
  termii_api_key: string | null
  termii_sender_id: string | null
  reminders_enabled: boolean
  email_from_name: string | null
  custom_email_domain: string | null
  custom_email_domain_verified: boolean
}

type Props = {
  company: Company
  templates: Template[]
  userRole: string
}

const TRIGGER_LABELS: Record<string, string> = {
  deposit_overdue: 'Deposit overdue',
  installment_overdue: 'Installment overdue',
  payment_due_soon: 'Payment due soon',
  payment_completed: 'Payment completed',
  manual: 'Manual',
}

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS only',
  email: 'Email only',
  both: 'SMS & Email',
}

export function RemindersTab({ company, templates, userRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [smsSuccess, setSmsSuccess] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [editDays, setEditDays] = useState(0)
  const [editChannel, setEditChannel] = useState<'sms' | 'email' | 'both'>('sms')
  const [customDomain, setCustomDomain] = useState(company.custom_email_domain ?? '')
  const [fromName, setFromName] = useState(company.email_from_name ?? company.name)
  const [copied, setCopied] = useState(false)

  const isAdmin = userRole === 'admin'

  const currentFromAddress = resolveFromAddress(
    company.slug,
    company.custom_email_domain,
    company.custom_email_domain_verified,
    company.name
  )

  function handleSmsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateReminderSettings(formData)
      if (!result.success) { setError(result.error); return }
      setSmsSuccess(true)
      router.refresh()
      setTimeout(() => setSmsSuccess(false), 3000)
    })
  }

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateEmailDomainSettings(formData)
      if (!result.success) { setError(result.error); return }
      setEmailSuccess(true)
      router.refresh()
      setTimeout(() => setEmailSuccess(false), 3000)
    })
  }

  function handleToggleTemplate(template: Template) {
    startTransition(async () => {
      await updateReminderTemplate(template.id, { is_active: !template.is_active })
      router.refresh()
    })
  }

  function handleSaveTemplate(templateId: string) {
    startTransition(async () => {
      await updateReminderTemplate(templateId, {
        message_template: editMessage,
        days_offset: editDays,
        channel: editChannel,
      })
      setEditingId(null)
      router.refresh()
    })
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── SMS settings ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-800 mb-1">SMS</h3>
        <p className="text-xs text-gray-400 mb-4">Send reminders via SMS using Termii</p>
        <form onSubmit={handleSmsSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable automated reminders</p>
              <p className="text-xs text-gray-400 mt-0.5">Sends reminders automatically based on templates below</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                name="reminders_enabled"
                type="checkbox"
                value="true"
                defaultChecked={company.reminders_enabled}
                disabled={!isAdmin}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-brand-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Termii API key
              <span className="ml-1 text-gray-400 font-normal">(required for SMS)</span>
            </label>
            <input
              name="termii_api_key"
              type="password"
              defaultValue={company.termii_api_key ?? ''}
              disabled={!isAdmin}
              placeholder="TLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sender ID</label>
            <input
              name="termii_sender_id"
              type="text"
              defaultValue={company.termii_sender_id ?? 'Rivera'}
              disabled={!isAdmin}
              placeholder="Rivera"
              maxLength={11}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">Max 11 characters. Shown as sender on recipient's phone.</p>
          </div>

          {isAdmin && (
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : smsSuccess ? <><Check size={14} /> Saved</>
                : 'Save SMS settings'}
            </button>
          )}
        </form>
      </div>

      {/* ── Email settings ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-800 mb-1">Email</h3>
        <p className="text-xs text-gray-400 mb-4">Send reminders via email using Rivera's email infrastructure</p>

        {/* Current from address */}
        <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-0.5">
            <Mail size={13} className="text-brand-500" />
            <p className="text-xs font-medium text-brand-700">Sending from</p>
          </div>
          <p className="text-sm font-mono text-brand-900">
            {fromName || company.name} &lt;{currentFromAddress}&gt;
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sender display name
            </label>
            <input
              name="email_from_name"
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              disabled={!isAdmin}
              placeholder={company.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">Shown as the sender name in the recipient's inbox.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Custom email domain
              <span className="ml-1 text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="custom_email_domain"
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                  disabled={!isAdmin}
                  placeholder="yourdomain.com"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
                />
              </div>
              {company.custom_email_domain_verified && (
                <div className="flex items-center gap-1 text-green-600 text-xs font-medium flex-shrink-0">
                  <ShieldCheck size={13} /> Verified
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Leave blank to send from{' '}
              <span className="font-mono">{company.slug}@mail.getrivera.co</span>
            </p>
          </div>

          {isAdmin && (
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : emailSuccess ? <><Check size={14} /> Saved</>
                : 'Save email settings'}
            </button>
          )}
        </form>

        {/* Rivera domain fallback info */}
        {!company.custom_email_domain && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Using Rivera sending domain</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your emails are sent from{' '}
              <span className="font-mono">{company.slug}@mail.getrivera.co</span>.
              To send from your own domain, add your domain above and complete DNS verification.
            </p>
          </div>
        )}

        {/* DNS instructions for unverified custom domain */}
        {company.custom_email_domain && !company.custom_email_domain_verified && (

          <div className="mt-4 border border-yellow-200 bg-yellow-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">DNS verification required</p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  Add these DNS records to <strong>{company.custom_email_domain}</strong> then contact Rivera to complete verification.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {getDNSRecords(company.custom_email_domain).map((record, i) => (
                <div key={i} className="bg-white border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{record.type}</span>
                    <button
                      onClick={() => handleCopy(record.value)}
                      className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
                    >
                      <Copy size={10} />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400 w-10 flex-shrink-0">Host</span>
                      <span className="font-mono text-gray-700 break-all">{record.host}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400 w-10 flex-shrink-0">Value</span>
                      <span className="font-mono text-gray-700 break-all">{record.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Reminder templates ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">Reminder templates</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Set the channel and message for each reminder type.
            Variables: {'{{buyer_name}}'}, {'{{listing_title}}'}, {'{{amount}}'}, {'{{days_overdue}}'}, {'{{company_name}}'}
          </p>
        </div>

        <div className="divide-y divide-gray-50">
          {templates.map((template) => (
            <div key={template.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{template.name}</p>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                      {TRIGGER_LABELS[template.trigger_type] ?? template.trigger_type}
                    </span>
                    {template.days_offset > 0 && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                        {template.days_offset} day{template.days_offset !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded text-xs font-medium">
                      {CHANNEL_LABELS[template.channel] ?? template.channel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleToggleTemplate(template)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                          template.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {template.is_active
                          ? <><Bell size={11} /> Active</>
                          : <><BellOff size={11} /> Inactive</>
                        }
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(template.id)
                          setEditMessage(template.message_template)
                          setEditDays(template.days_offset)
                          setEditChannel(template.channel ?? 'sms')
                        }}
                        className="px-2 py-1 text-xs text-brand-500 hover:underline"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === template.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                    <select
                      value={editChannel}
                      onChange={(e) => setEditChannel(e.target.value as 'sms' | 'email' | 'both')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="sms">SMS only</option>
                      <option value="email">Email only</option>
                      <option value="both">SMS & Email</option>
                    </select>
                  </div>

                  {template.days_offset > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Days offset</label>
                      <input
                        type="number"
                        value={editDays}
                        onChange={(e) => setEditDays(parseInt(e.target.value))}
                        min={0}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{editMessage.length} characters</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveTemplate(template.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-xs font-medium rounded-lg"
                    >
                      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 font-mono text-xs leading-relaxed">
                  {template.message_template}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getDNSRecords(domain: string) {
  return [
    { type: 'TXT', host: '@', value: 'v=spf1 include:amazonses.com ~all' },
    { type: 'CNAME', host: 'resend._domainkey', value: 'resend._domainkey.getrivera.co' },
    { type: 'MX', host: '@', value: 'feedback-smtp.eu-west-1.amazonses.com' },
  ]
}