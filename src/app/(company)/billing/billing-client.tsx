'use client'

import { useState, useTransition } from 'react'
import { formatNaira, formatDate } from '@/lib/utils'
import { initiateSubscriptionPayment, initiateInvoicePayment } from '@/actions/billing'
import type { AddonChargeCalc } from '@/lib/billing'
import {
  CreditCard,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  TrendingUp,
} from 'lucide-react'

type Subscription = {
  status: string
  plan_slug: string
  billing_cycle: string
  price_kobo_per_cycle: number
  trial_ends_at: string | null
  current_period_end: string | null
  grace_period_ends_at: string | null
}

type Usage = {
  cac_verifications: number
  sms_sent: number
  emails_sent: number
  storage_bytes_used: number
}

type Invoice = {
  id: string
  invoice_number: string
  month: string
  billing_type: string
  base_amount_kobo: number
  addon_amount_kobo: number
  total_kobo: number
  status: string
  due_at: string
  paid_at: string | null
}

type Plan = {
  id: string
  slug: string
  name: string
  price_kobo_monthly: number
  max_staff: number
  max_listings: number
  max_partners: number
  storage_limit_gb: number
  free_emails_monthly: number
}

type Props = {
  subscription: Subscription | null
  usage: Usage | null
  invoices: Invoice[]
  plans: Plan[]
  addonCharges: AddonChargeCalc[]
  estimatedAddonTotal: number
  addonPricing: {
    cac: { priceKobo: number }
    sms: { blockSize: number; blockPriceKobo: number }
    email: { freeMonthly: number; blockSize: number; blockPriceKobo: number }
    storage: { freeGb: number; blockGb: number; blockPriceKobo: number }
  }
}

const STATUS_STYLES: Record<string, { style: string; icon: React.ElementType; label: string }> = {
  trialing: { style: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Trial' },
  active: { style: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Active' },
  past_due: { style: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'Past due' },
  suspended: { style: 'bg-red-100 text-red-600', icon: AlertCircle, label: 'Suspended' },
  cancelled: { style: 'bg-gray-100 text-gray-500', icon: AlertCircle, label: 'Cancelled' },
}

const INVOICE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  waived: 'bg-gray-100 text-gray-500',
}

const ADDON_LABELS: Record<string, string> = {
  cac: 'CAC verifications',
  sms: 'SMS messages',
  email: 'Emails',
  storage: 'Storage',
}

export function BillingClient({
  subscription,
  usage,
  invoices,
  plans,
  addonCharges,
  estimatedAddonTotal,
  addonPricing,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'invoices' | 'usage'>('overview')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const status = subscription?.status ?? 'trialing'
  const planSlug = subscription?.plan_slug ?? 'starter'
  const StatusInfo = STATUS_STYLES[status] ?? STATUS_STYLES.trialing
  const StatusIcon = StatusInfo.icon

  function handleSubscribe(planSlug: string, cycle: 'monthly' | 'quarterly' | 'annual') {
    setLoadingAction(`${planSlug}-${cycle}`)
    setError(null)

    startTransition(async () => {
      const result = await initiateSubscriptionPayment(planSlug, cycle)
      if (!result.success) {
        setError(result.error)
        setLoadingAction(null)
        return
      }
      const data = result.data as { url: string }
      window.location.href = data.url
    })
  }

  function handlePayInvoice(invoiceId: string) {
    setLoadingAction(invoiceId)
    setError(null)

    startTransition(async () => {
      const result = await initiateInvoicePayment(invoiceId)
      if (!result.success) {
        setError(result.error)
        setLoadingAction(null)
        return
      }
      const data = result.data as { url: string }
      window.location.href = data.url
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status banner */}
      {status === 'trialing' && subscription?.trial_ends_at && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Clock size={18} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Your free trial ends on <strong>{formatDate(subscription.trial_ends_at)}</strong>.
            Subscribe to keep access after your trial.
          </p>
        </div>
      )}

      {status === 'past_due' && subscription?.grace_period_ends_at && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
            Payment overdue. Your account will be suspended on{' '}
            <strong>{formatDate(subscription.grace_period_ends_at)}</strong>.
            Please pay your outstanding invoice to continue.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['overview', 'plans', 'invoices', 'usage'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors ${
              activeTab === tab
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Current plan */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-gray-400" />
              Current plan
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 capitalize">{planSlug}</p>
                <p className="text-sm text-gray-500 mt-1 capitalize">
                  {subscription?.billing_cycle ?? 'monthly'} billing
                  {subscription?.price_kobo_per_cycle
                    ? ` · ${formatNaira(subscription.price_kobo_per_cycle)}`
                    : ''}
                </p>
                {subscription?.current_period_end && (
                  <p className="text-xs text-gray-400 mt-1">
                    Renews {formatDate(subscription.current_period_end)}
                  </p>
                )}
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${StatusInfo.style}`}>
                <StatusIcon size={12} />
                {StatusInfo.label}
              </span>
            </div>
          </div>

          {/* This month estimated */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-gray-400" />
              This month — estimated charges
            </h2>
            <div className="space-y-2">
              {subscription?.billing_cycle === 'monthly' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 capitalize">{planSlug} plan</span>
                  <span className="font-medium">
                    {formatNaira(subscription?.price_kobo_per_cycle ?? 0)}
                  </span>
                </div>
              )}
              {addonCharges.length === 0 && (
                <p className="text-sm text-gray-400">No add-on charges this month</p>
              )}
              {addonCharges.map((charge) => (
                <div key={charge.type} className="flex justify-between text-sm">
                  <span className="text-gray-500">{ADDON_LABELS[charge.type]}</span>
                  <span className="font-medium">{formatNaira(charge.totalKobo)}</span>
                </div>
              ))}
              {(addonCharges.length > 0 || subscription?.billing_cycle === 'monthly') && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100 font-semibold">
                  <span>Estimated total</span>
                  <span>
                    {formatNaira(
                      estimatedAddonTotal +
                      (subscription?.billing_cycle === 'monthly'
                        ? subscription?.price_kobo_per_cycle ?? 0
                        : 0)
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Add-on pricing reference */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-gray-400" />
              Add-on pricing
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>CAC verification</span>
                <span className="font-medium">{formatNaira(addonPricing.cac.priceKobo)} per check</span>
              </div>
              <div className="flex justify-between">
                <span>SMS</span>
                <span className="font-medium">
                  {formatNaira(addonPricing.sms.blockPriceKobo)} per {addonPricing.sms.blockSize.toLocaleString()} messages
                </span>
              </div>
              <div className="flex justify-between">
                <span>Email</span>
                <span className="font-medium">
                  First {addonPricing.email.freeMonthly.toLocaleString()} free,
                  then {formatNaira(addonPricing.email.blockPriceKobo)} per {addonPricing.email.blockSize.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Storage</span>
                <span className="font-medium">
                  First {addonPricing.storage.freeGb}GB free,
                  then {formatNaira(addonPricing.storage.blockPriceKobo)} per {addonPricing.storage.blockGb}GB
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans tab */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Choose a plan. Add-ons are billed monthly on top of your base plan regardless of billing cycle.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.slug === planSlug
              return (
                <div
                  key={plan.id}
                  className={`bg-white border rounded-xl p-5 ${
                    isCurrent ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-brand-100 text-brand-600 text-xs font-medium rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNaira(plan.price_kobo_monthly)}
                    <span className="text-sm font-normal text-gray-400">/month</span>
                  </p>
                  <div className="space-y-1.5 text-sm text-gray-500 my-4">
                    <p>Up to {plan.max_staff} staff members</p>
                    <p>Up to {plan.max_listings} listings</p>
                    <p>Up to {plan.max_partners} partners</p>
                    <p>{plan.storage_limit_gb}GB storage included</p>
                    <p>{plan.free_emails_monthly.toLocaleString()} emails/month free</p>
                  </div>

                  {!isCurrent && (
                    <div className="space-y-2 mt-4">
                      {(['monthly', 'quarterly', 'annual'] as const).map((cycle) => {
                        const cycles = cycle === 'annual' ? 12 : cycle === 'quarterly' ? 3 : 1
                        const total = plan.price_kobo_monthly * cycles
                        const actionKey = `${plan.slug}-${cycle}`
                        return (
                          <button
                            key={cycle}
                            onClick={() => handleSubscribe(plan.slug, cycle)}
                            disabled={isPending}
                            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            <span className="capitalize text-gray-700">{cycle}</span>
                            <span className="font-medium flex items-center gap-2">
                              {formatNaira(total)}
                              {loadingAction === actionKey && (
                                <Loader2 size={12} className="animate-spin" />
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invoices tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <CreditCard size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No invoices yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Invoices will appear here after your first billing cycle
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Invoice</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Month</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Due</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-400 capitalize">{invoice.billing_type}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-700">{invoice.month}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {formatNaira(invoice.total_kobo)}
                        </p>
                        {invoice.addon_amount_kobo > 0 && (
                          <p className="text-xs text-gray-400">
                            incl. {formatNaira(invoice.addon_amount_kobo)} add-ons
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          INVOICE_STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-500'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-gray-400">
                          {invoice.paid_at
                            ? `Paid ${formatDate(invoice.paid_at)}`
                            : formatDate(invoice.due_at)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {invoice.status === 'pending' || invoice.status === 'overdue' ? (
                          <button
                            onClick={() => handlePayInvoice(invoice.id)}
                            disabled={isPending}
                            className="flex items-center gap-1 text-xs text-brand-500 hover:underline disabled:opacity-50"
                          >
                            {loadingAction === invoice.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <ExternalLink size={11} />
                            )}
                            Pay now
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Usage tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Current month usage</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">CAC verifications</p>
              <p className="text-2xl font-bold text-gray-900">
                {usage?.cac_verifications ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatNaira((usage?.cac_verifications ?? 0) * addonPricing.cac.priceKobo)} charged
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">SMS sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {(usage?.sms_sent ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Billed per {addonPricing.sms.blockSize.toLocaleString()} block
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">Emails sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {(usage?.emails_sent ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {addonPricing.email.freeMonthly.toLocaleString()} free per month
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">Storage used</p>
              <p className="text-2xl font-bold text-gray-900">
                {usage?.storage_bytes_used
                  ? `${(usage.storage_bytes_used / (1024 * 1024 * 1024)).toFixed(2)} GB`
                  : '0 GB'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {addonPricing.storage.freeGb}GB included free
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}