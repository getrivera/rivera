import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, Plus } from 'lucide-react'

export default async function PartnerSalesPage() {
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

  const { data: salesRaw } = await supabase
    .from('buyers')
    .select(`
      id,
      full_name,
      phone,
      status,
      source,
      created_at,
      listings ( title, location_city, location_state )
    `)
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })

  type Sale = {
    id: string
    full_name: string
    phone: string
    status: string
    source: string
    created_at: string
    listings: { title: string; location_city: string; location_state: string } | null
  }

  const sales = (salesRaw ?? []) as Sale[]

  const STATUS_STYLES: Record<string, string> = {
    pending_deposit: 'bg-yellow-100 text-yellow-700',
    on_track: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-600',
    fully_paid: 'bg-blue-100 text-blue-700',
    defaulted: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-gray-100 text-gray-400',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sales</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {sales.length} buyer{sales.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link
          href="/partner/sales/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Register buyer
        </Link>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No sales yet</p>
          <p className="text-gray-400 text-sm mt-1">Register your first buyer to get started</p>
          <Link
            href="/partner/sales/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            Register buyer
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Buyer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Listing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{sale.full_name}</p>
                    <p className="text-xs text-gray-400">{sale.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 truncate max-w-40">
                      {sale.listings?.title ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {sale.listings
                        ? `${sale.listings.location_city}, ${sale.listings.location_state}`
                        : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[sale.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {sale.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-400">{formatDate(sale.created_at)}</p>
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