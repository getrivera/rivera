import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can, type StaffRole } from '@/lib/permissions'
import { Shield } from 'lucide-react'
import { AuditClient } from './audit-client'

type StaffRecord = { company_id: string; role: string }

export type AuditLog = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  performed_by: string | null
  performed_by_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export default async function AuditPage() {
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

  if (!can.viewAuditLog(staff.role as StaffRole)) {
    redirect('/dashboard')
  }

  // Fetch last 6 months — client will filter down to 1 month default
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: logsRaw } = await supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_id, entity_label, performed_by, performed_by_name, metadata, created_at')
    .eq('company_id', staff.company_id)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(500)

  const logs = (logsRaw ?? []) as AuditLog[]

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <Shield size={18} className="text-gray-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            All actions performed in your company portal
          </p>
        </div>
      </div>

      <AuditClient logs={logs} />
    </div>
  )
}