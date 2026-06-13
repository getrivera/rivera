import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

export default async function PartnerCommissionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) redirect('/partner/login')
  const partner = partnerRaw as { id: string }

  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select(`
      id,
      amount_kobo,
      status,
      trigger_event,
      triggered_at,
      paid_at,
      listings ( title )
    `)
    .eq('partner_id', partner.id)
    .order('triggered_at', { ascending: false, nullsFirst: false })

  type Commission = {
    id: string
    amount_kobo: number
    status: string
    trigger_event: string
    triggered_at: string | null
    paid_at: string | null
    listings: { title: string } | null
  }

  const commissions = (commissionsRaw ?? []) as Commission[]

  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const totalPending = commissions
    .filter((c) => ['pending', 'due', 'approved', 'processing'].includes(c.status))
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    due: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600',
    returned: 'bg-orange-100 text-orange-600',
    clawed_back: 'bg-gray-100 text-gray-400',
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <p className="text-gray-500 mt-1 text-sm">Your commission history</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-700">Total paid</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{formatNaira(totalPaid)}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{formatNaira(totalPending)}</p>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No commissions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Register buyers to start earning commissions
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Listing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {commissions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 truncate max-w-40">
                      {c.listings?.title ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {formatNaira(c.amount_kobo)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[c.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-400">
                      {c.triggered_at ? formatDate(c.triggered_at) : '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}