import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate, initials } from '@/lib/utils'
import { PartnerStatusActions } from './partner-status-actions'
import Link from 'next/link'
import { ChevronLeft, Phone, Mail, Calendar, Users } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

type Partner = {
  id: string
  full_name: string
  email: string
  phone: string
  photo_url: string | null
}

type PartnerCompany = {
  id: string
  status: string
  join_method: string
  invited_by: string | null
  created_at: string
  invited_email: string | null
  invited_name: string | null
}

type Sale = {
  id: string
  full_name: string
  phone: string
  status: string
  created_at: string
  listings: { title: string } | null
}

type Commission = {
  id: string
  amount_kobo: number
  status: string
  triggered_at: string | null
  paid_at: string | null
  listings: { title: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-600',
  removed: 'bg-gray-100 text-gray-500',
}

const JOIN_METHOD_LABELS: Record<string, string> = {
  email_invite: 'Email invite',
  link: 'Invite link',
  code: 'Company code',
}

const COMMISSION_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  due: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  clawed_back: 'bg-red-100 text-red-600',
}

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string }
}) {
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

  // Get partner_companies record — the link between this partner and company
  const { data: pcRaw } = await supabase
    .from('partner_companies')
    .select('id, status, join_method, invited_by, created_at, invited_email, invited_name, partner_id')
    .eq('company_id', staff.company_id)
    .eq('id', params.id)
    .single()

  if (!pcRaw) notFound()

  const pc = pcRaw as PartnerCompany & { partner_id: string | null }

  // Get partner profile if they have an account
  let partner: Partner | null = null
  if (pc.partner_id) {
    const { data: partnerRaw } = await supabase
      .from('partners')
      .select('id, full_name, email, phone, photo_url')
      .eq('id', pc.partner_id)
      .single()
    partner = partnerRaw as Partner | null
  }

  const displayName = partner?.full_name ?? pc.invited_name ?? pc.invited_email ?? 'Unknown'
  const displayEmail = partner?.email ?? pc.invited_email ?? ''
  const displayPhone = partner?.phone ?? ''

  // Get their sales
  const { data: salesRaw } = await supabase
    .from('buyers')
    .select('id, full_name, phone, status, created_at, listings(title)')
    .eq('company_id', staff.company_id)
    .eq('partner_id', pc.partner_id ?? '')
    .order('created_at', { ascending: false })

  const sales = (salesRaw ?? []) as Sale[]

  // Get their commissions
  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select('id, amount_kobo, status, triggered_at, paid_at, listings(title)')
    .eq('company_id', staff.company_id)
    .eq('partner_id', pc.partner_id ?? '')
    .order('triggered_at', { ascending: false })

  const commissions = (commissionsRaw ?? []) as Commission[]

  const totalCommissionPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const totalCommissionPending = commissions
    .filter((c) => ['pending', 'due'].includes(c.status))
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const canManage = ['admin', 'manager'].includes(staff.role)

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/partners"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to partners
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
              {partner?.photo_url ? (
                <img
                  src={partner.photo_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(displayName)
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_STYLES[pc.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {pc.status}
                </span>
              </div>
              {displayEmail && (
                <p className="text-sm text-gray-500">{displayEmail}</p>
              )}
            </div>
          </div>

          {canManage && (
            <PartnerStatusActions
              partnerCompanyId={pc.id}
              currentStatus={pc.status}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Sales */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Sales</h2>
              <span className="text-xs text-gray-400">{sales.length} total</span>
            </div>

            {sales.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No sales registered yet
              </div>
            ) : (
              <div className="space-y-2">
                {sales.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/sales/${sale.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {sale.full_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sale.listings?.title ?? '—'} · {formatDate(sale.created_at)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        sale.status === 'fully_paid'
                          ? 'bg-blue-100 text-blue-700'
                          : sale.status === 'on_track'
                          ? 'bg-green-100 text-green-700'
                          : sale.status === 'overdue'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {sale.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Commissions */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Commission history</h2>
              <span className="text-xs text-gray-400">{commissions.length} entries</span>
            </div>

            {commissions.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No commissions yet
              </div>
            ) : (
              <div className="space-y-2">
                {commissions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatNaira(c.amount_kobo)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.listings?.title ?? '—'}
                        {c.triggered_at && ` · ${formatDate(c.triggered_at)}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        COMMISSION_STATUS_STYLES[c.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total sales</span>
                <span className="font-medium">{sales.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commission paid</span>
                <span className="font-medium text-green-600">
                  {formatNaira(totalCommissionPaid)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commission pending</span>
                <span className="font-medium text-yellow-600">
                  {formatNaira(totalCommissionPending)}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Contact</h2>
            <div className="space-y-3">
              {displayEmail && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{displayEmail}</span>
                </div>
              )}
              {displayPhone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{displayPhone}</span>
                </div>
              )}
              {!displayEmail && !displayPhone && (
                <p className="text-sm text-gray-400">No contact info</p>
              )}
            </div>
          </div>

          {/* Join info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Join details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">
                  {JOIN_METHOD_LABELS[pc.join_method] ?? pc.join_method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invited</span>
                <span className="font-medium">{formatDate(pc.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account</span>
                <span className={`font-medium ${partner ? 'text-green-600' : 'text-yellow-600'}`}>
                  {partner ? 'Created' : 'Pending signup'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}