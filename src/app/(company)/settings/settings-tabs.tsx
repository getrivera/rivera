'use client'

import { useState, useTransition, useRef } from 'react'
import { updateCompanyDetails, updateBranding } from '@/actions/settings'
import { Upload, Check, Loader2 } from 'lucide-react'
import { StaffTab } from './staff-tab'
import { RemindersTab } from './reminders-tab'
import { CACVerificationWidget } from './cac-verification-widget'
import { PaymentsTab } from './payments-tab'

type Company = {
  id: string
  name: string
  slug: string
  rc_number: string | null
  brand_colour: string | null
  logo_url: string | null
  company_code: string
  subscription_plan: string
  subscription_status: string
  commission_payout_mode: string | null
  termii_api_key: string | null
  termii_sender_id: string | null
  reminders_enabled: boolean
  cac_verified: boolean
  cac_verified_at: string | null
  cac_company_name: string | null
  cac_company_type: string | null
  cac_company_status: string | null
  cac_registration_date: string | null
  email_from_name: string | null
  custom_email_domain: string | null
  custom_email_domain_verified: boolean
}

type StaffMember = {
  id: string
  user_id: string
  role: string
  status: string
  created_at: string
  full_name: string
  email: string
}

type ReminderTemplate = {
  id: string
  name: string
  trigger_type: string
  days_offset: number
  message_template: string
  is_active: boolean
  channel: 'sms' | 'email' | 'both'
}

type PaystackConfig = {
  id: string
  paystack_secret_key: string
  paystack_public_key: string | null
  business_name: string | null
  is_active: boolean
  connected_at: string
} | null

type Props = {
  company: Company
  userRole: string
  staffMembers: StaffMember[]
  currentUserId: string
  templates: ReminderTemplate[]
  paystackConfig: PaystackConfig
}

const TABS = ['Company', 'Branding', 'Staff', 'Reminders', 'Payments'] as const
type Tab = typeof TABS[number]

export function SettingsTabs({
  company,
  userRole,
  staffMembers,
  currentUserId,
  templates,
  paystackConfig,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Company')

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Company' && (
        <CompanyTab
          company={company}
          userRole={userRole}
          staffMembers={staffMembers}
          currentUserId={currentUserId}
          templates={templates}
          paystackConfig={paystackConfig}
        />
      )}
      {activeTab === 'Branding' && (
        <BrandingTab
          company={company}
          userRole={userRole}
          staffMembers={staffMembers}
          currentUserId={currentUserId}
          templates={templates}
          paystackConfig={paystackConfig}
        />
      )}
      {activeTab === 'Staff' && (
        <StaffTab
          staff={staffMembers}
          currentUserId={currentUserId}
          currentUserRole={userRole}
        />
      )}
      {activeTab === 'Reminders' && (
        <RemindersTab
          company={company}
          templates={templates}
          userRole={userRole}
        />
      )}
      {activeTab === 'Payments' && (
        <PaymentsTab
          config={paystackConfig}
          isAdmin={userRole === 'admin'}
        />
      )}
    </div>
  )
}

// ── Company tab ───────────────────────────────────────────────────────────────

function CompanyTab({ company, userRole }: Props) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canEdit = ['admin', 'manager'].includes(userRole)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateCompanyDetails(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          defaultValue={company.name}
          required
          disabled={!canEdit}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          RC Number
          <span className="ml-2 text-xs text-gray-400">(CAC registration number)</span>
        </label>
        <input
          name="rc_number"
          type="text"
          defaultValue={company.rc_number ?? ''}
          disabled={!canEdit}
          placeholder="e.g. RC1234567"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Save your RC number then verify below
        </p>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CAC verification
        </label>
        <CACVerificationWidget
          rcNumber={company.rc_number}
          isVerified={company.cac_verified}
          cacCompanyName={company.cac_company_name}
          cacCompanyType={company.cac_company_type}
          cacCompanyStatus={company.cac_company_status}
          cacRegistrationDate={company.cac_registration_date}
          cacVerifiedAt={company.cac_verified_at}
          isAdmin={userRole === 'admin'}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company code
          <span className="ml-2 text-xs text-gray-400">(Partners use this to join)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={company.company_code}
            readOnly
            className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono tracking-wider text-gray-700"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(company.company_code)}
            className="text-xs text-brand-500 hover:underline"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Portal URL
        </label>
        <input
          type="text"
          value={`${company.slug}.rivera-staging.vercel.app`}
          readOnly
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Commission payout mode
        </label>
        <select
          name="commission_payout_mode"
          defaultValue={company.commission_payout_mode ?? 'manual'}
          disabled={!canEdit}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
        >
          <option value="manual">Manual — finance approves each commission</option>
          <option value="auto_approve">Auto-approve — commissions approved automatically when due</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Controls whether commissions require manual approval before payment
        </p>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Saving…</>
            ) : success ? (
              <><Check size={14} /> Saved</>
            ) : 'Save changes'}
          </button>
        </div>
      )}
    </form>
  )
}

// ── Branding tab ──────────────────────────────────────────────────────────────

function BrandingTab({ company, userRole }: Props) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(company.logo_url)
  const [colour, setColour] = useState(company.brand_colour ?? '#1B4F72')
  const fileRef = useRef<HTMLInputElement>(null)
  const canEdit = ['admin', 'manager'].includes(userRole)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB')
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateBranding(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Company logo
        </label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {previewUrl ? (
              <img src={previewUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: colour }}
              >
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {canEdit && (
            <div>
              <input
                ref={fileRef}
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={14} />
                Upload logo
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP or SVG. Max 2MB.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brand colour
        </label>
        <div className="flex items-center gap-3">
          <input
            name="brand_colour"
            type="color"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            disabled={!canEdit}
            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer disabled:cursor-not-allowed p-0.5"
          />
          <input
            type="text"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            disabled={!canEdit}
            placeholder="#1B4F72"
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
          />
          <div
            className="px-3 py-2 rounded-lg text-white text-xs font-medium"
            style={{ backgroundColor: colour }}
          >
            Preview
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Used in your partner portal sidebar and accent colours
        </p>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Saving…</>
            ) : success ? (
              <><Check size={14} /> Saved</>
            ) : 'Save branding'}
          </button>
        </div>
      )}
    </form>
  )
}