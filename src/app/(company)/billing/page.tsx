import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BILLING_ENABLED, calculateAddonCharges, ADDON_PRICING } from '@/lib/billing'
import { getBillingOverview } from '@/actions/billing'
import { formatNaira, formatDate } from '@/lib/utils'
import { BillingClient } from './billing-client'
import { Construction } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as StaffRecord

  if (staff.role !== 'admin') redirect('/dashboard')

  // If billing not enabled, show coming soon
  if (!BILLING_ENABLED) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your subscription and usage</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Construction size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Coming soon</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Billing and subscription management is being set up.
            You&apos;ll be notified when it&apos;s ready.
          </p>
        </div>
      </div>
    )
  }

  const { subscription, usage, invoices, plans } = await getBillingOverview(staff.company_id)

  const addonCharges = usage ? calculateAddonCharges(usage) : []
  const estimatedAddonTotal = addonCharges.reduce((sum, c) => sum + c.totalKobo, 0)

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your subscription and usage</p>
      </div>

      <BillingClient
        subscription={subscription}
        usage={usage}
        invoices={invoices}
        plans={plans}
        addonCharges={addonCharges}
        estimatedAddonTotal={estimatedAddonTotal}
        addonPricing={ADDON_PRICING}
      />
    </div>
  )
}