import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommissionsClient } from './commissions-client'
import { formatNaira } from '@/lib/utils'

type StaffRecord = { company_id: string; role: string }

export type CommissionEvent = {
  id: string
  event_type: string
  from_status: string | null
  to_status: string | null
  note: string | null
  performed_by_name: string | null
  created_at: string
}

export type CommissionRow = {
  id: string
  amount_kobo: number
  status: string
  status_note: string | null
  trigger_event: string
  triggered_at: string | null
  paid_at: string | null
  transfer_reference: string | null
  partner_name: string
  partner_id: string
  listing_title: string
  listing_id: string
  buyer_name: string
  buyer_id: string
  events: CommissionEvent[]
}

export default async function CommissionsPage() {
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

  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select(`
      id,
      amount_kobo,
      status,
      trigger_event,
      triggered_at,
      paid_at,
      transfer_reference,
      status_note,
      partner_id,
      listing_id,
      buyer_id,
      partners ( full_name ),
      listings ( title ),
      buyers ( full_name )
    `)
    .eq('company_id', staff.company_id)
    .order('created_at', { ascending: false })
    .limit(500)

  type CommissionRaw = {
    id: string
    amount_kobo: number
    status: string
    status_note: string | null
    trigger_event: string
    triggered_at: string | null
    paid_at: string | null
    transfer_reference: string | null
    partner_id: string
    listing_id: string
    buyer_id: string
    partners: { full_name: string } | null
    listings: { title: string } | null
    buyers: { full_name: string } | null
  }

  const commissions = (commissionsRaw ?? []) as CommissionRaw[]

  // Status-change history (approvals, declines, failures…) for the listed
  // commissions — one batched query, grouped in memory.
  const commissionIds = commissions.map((c) => c.id)
  let eventsByCommission: Record<string, CommissionEvent[]> = {}

  if (commissionIds.length > 0) {
    const { data: eventsRaw } = await supabase
      .from('commission_events')
      .select('id, commission_id, event_type, from_status, to_status, note, performed_by_name, created_at')
      .in('commission_id', commissionIds)
      .order('created_at', { ascending: false })

    type EventRaw = CommissionEvent & { commission_id: string }
    const events = (eventsRaw ?? []) as EventRaw[]

    eventsByCommission = events.reduce<Record<string, CommissionEvent[]>>((acc, e) => {
      ;(acc[e.commission_id] ??= []).push({
        id: e.id,
        event_type: e.event_type,
        from_status: e.from_status,
        to_status: e.to_status,
        note: e.note,
        performed_by_name: e.performed_by_name,
        created_at: e.created_at,
      })
      return acc
    }, {})
  }

  const rows: CommissionRow[] = commissions.map((c) => ({
    id: c.id,
    amount_kobo: c.amount_kobo,
    status: c.status,
    status_note: c.status_note ?? null,
    trigger_event: c.trigger_event,
    triggered_at: c.triggered_at,
    paid_at: c.paid_at,
    transfer_reference: c.transfer_reference,
    partner_name: c.partners?.full_name ?? 'Unknown',
    partner_id: c.partner_id,
    listing_title: c.listings?.title ?? 'Unknown',
    listing_id: c.listing_id,
    buyer_name: c.buyers?.full_name ?? 'Unknown',
    buyer_id: c.buyer_id,
    events: eventsByCommission[c.id] ?? [],
  }))

  const totalDue = rows
    .filter((r) => ['due', 'approved'].includes(r.status))
    .reduce((sum, r) => sum + r.amount_kobo, 0)

  const totalPaid = rows
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount_kobo, 0)

  const totalPending = rows
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount_kobo, 0)

  const canManage = ['admin', 'finance'].includes(staff.role)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track and manage partner commissions
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatNaira(totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">Trigger not yet met</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-sm text-yellow-700">Due for payment</p>
          <p className="text-xl font-bold text-yellow-800 mt-1">{formatNaira(totalDue)}</p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting approval or processing</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-700">Total paid</p>
          <p className="text-xl font-bold text-green-800 mt-1">{formatNaira(totalPaid)}</p>
          <p className="text-xs text-green-600 mt-1">All time</p>
        </div>
      </div>

      <CommissionsClient commissions={rows} canManage={canManage} />
    </div>
  )
}