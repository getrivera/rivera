import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsTabs } from './settings-tabs'

type CompanyData = {
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

export default async function SettingsPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role, id')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')
  const staff = staffData as { company_id: string; role: string; id: string }

  const { data: companyData } = await supabase
    .from('companies')
    .select('id, name, slug, rc_number, brand_colour, logo_url, company_code, subscription_plan, subscription_status, commission_payout_mode, termii_api_key, termii_sender_id, reminders_enabled, cac_verified, cac_verified_at, cac_company_name, cac_company_type, cac_company_status, cac_registration_date, email_from_name, custom_email_domain, custom_email_domain_verified')
    .eq('id', staff.company_id)
    .single()

  if (!companyData) redirect('/login')
  const company = companyData as CompanyData

  const { data: allStaffRaw } = await supabase
    .from('company_staff')
    .select('id, user_id, role, status, created_at')
    .eq('company_id', staff.company_id)
    .order('created_at', { ascending: true })

  const allStaff = (allStaffRaw ?? []) as {
    id: string
    user_id: string
    role: string
    status: string
    created_at: string
  }[]

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', allStaff.map((s) => s.user_id))

  const profiles = (profilesRaw ?? []) as { id: string; full_name: string; email: string }[]

  const staffMembers: StaffMember[] = allStaff.map((s) => {
    const profile = profiles.find((p) => p.id === s.user_id)
    return {
      id: s.id,
      user_id: s.user_id,
      role: s.role,
      status: s.status,
      created_at: s.created_at,
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
    }
  })

  const { data: templatesRaw } = await supabase
    .from('reminder_templates')
    .select('id, name, trigger_type, days_offset, message_template, is_active')
    .eq('company_id', staff.company_id)
    .order('trigger_type', { ascending: true })

  const templates = (templatesRaw ?? []) as ReminderTemplate[]

  // Fetch Paystack config — admin only
  let paystackConfig: PaystackConfig = null
  if (staff.role === 'admin') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configRaw } = await (adminClient as any)
      .from('company_paystack_config')
      .select('id, paystack_secret_key, paystack_public_key, business_name, is_active, connected_at')
      .eq('company_id', staff.company_id)
      .eq('is_active', true)
      .single()

    paystackConfig = configRaw as PaystackConfig
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your company details and branding</p>
      </div>
      <SettingsTabs
        company={company}
        userRole={staff.role}
        staffMembers={staffMembers}
        currentUserId={user.id}
        templates={templates}
        paystackConfig={paystackConfig}
      />
    </div>
  )
}