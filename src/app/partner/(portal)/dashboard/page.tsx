import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, DollarSign, Clock, TrendingUp } from 'lucide-react'

export default async function PartnerDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: partnerRaw } = await supabase
    .from('partners')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!partnerRaw) redirect('/partner/login')
  const partner = partnerRaw as { id: string; full_name: string }

  // Sales stats
  const { data: salesRaw } = await supabase
    .from('buyers')
    .select('id, status, created_at')
    .eq('partner_id', partner.id)

  const sales = (salesRaw ?? []) as { id: string; status: string; created_at: string }[]

  // Commission stats
  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select('amount_kobo, status')
    .eq('partner_id', partner.id)

  const commissions = (commissionsRaw ?? []) as { amount_kobo: number; status: string }[]

  const totalCommissionEarned = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const totalCommissionPending = commissions
    .filter((c) => ['pending', 'due', 'approved', 'processing'].includes(c.status))
    .reduce((sum, c) => sum + c.amount_kobo, 0)

  const firstName = partner.full_name.split(' ')[0]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Here's your performance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingBag size={16} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total sales</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock size={16} className="text-yellow-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {sales.filter((s) => s.status === 'pending_deposit').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Awaiting deposit</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign size={16} className="text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNaira(totalCommissionEarned)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Commission paid</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNaira(totalCommissionPending)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Commission pending</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/partner/listings"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-500 transition-colors group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">
            Browse listings →
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            View available properties and download marketing materials
          </p>
        </Link>

        <Link
          href="/partner/sales/new"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-500 transition-colors group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">
            Register a buyer →
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Submit a new buyer for a property listing
          </p>
        </Link>
      </div>
    </div>
  )
}