import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/utils'
import { VA_ENABLED } from '@/lib/paystack-va'
import { VA_DEMO_MODE, getDemoVA, getDemoTransactions } from '@/lib/va-demo'
import { hasCompanyPaystackConfig } from '@/lib/paystack-company'
import Link from 'next/link'
import { CreditCard, Construction } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

export default async function VirtualAccountsPage() {
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

  const adminClient = createAdminClient()
  const hasPaystack = await hasCompanyPaystackConfig(staff.company_id)
  const canShowVAs = VA_DEMO_MODE || hasPaystack || VA_ENABLED

  if (!canShowVAs) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Virtual Accounts</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Dedicated bank accounts for buyer payments
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Construction size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Paystack not connected
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Connect your Paystack account to enable virtual accounts for buyers.
            Payments go directly to your Paystack balance.
          </p>
          <Link
            href="/settings"
            className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
          >
            Connect Paystack in Settings
          </Link>
        </div>
      </div>
    )
  }

  type BuyerRow = {
    id: string
    full_name: string
    phone: string
    email: string | null
    created_at: string
  }

  type VARow = {
    id: string
    account_number: string
    account_name: string
    bank_name: string
    is_active: boolean
    created_at: string
    buyer_id: string
    buyers: {
      id: string
      full_name: string
      phone: string
      email: string | null
    } | null
  }

  type Row = {
    buyerId: string
    buyerName: string
    phone: string
    email: string | null
    accountNumber: string
    accountName: string
    bankName: string
    isActive: boolean
    totalReceived: number
    createdAt: string
  }

  let rows: Row[] = []

  if (VA_DEMO_MODE) {
    // Get all buyers and generate demo VAs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: buyersRaw } = await (adminClient as any)
      .from('buyers')
      .select('id, full_name, phone, email, created_at')
      .eq('company_id', staff.company_id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    const buyers = (buyersRaw ?? []) as BuyerRow[]

    rows = buyers.map((buyer) => {
      const demoVA = getDemoVA(buyer.id)
      const demoTxs = getDemoTransactions(buyer.id)
      const totalReceived = demoTxs.reduce((sum, tx) => sum + tx.amount_kobo, 0)
      return {
        buyerId: buyer.id,
        buyerName: buyer.full_name,
        phone: buyer.phone,
        email: buyer.email,
        accountNumber: demoVA.account_number,
        accountName: demoVA.account_name,
        bankName: demoVA.bank_name,
        isActive: true,
        totalReceived,
        createdAt: buyer.created_at,
      }
    })
  } else {
    // Real VAs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vasRaw } = await (adminClient as any)
      .from('virtual_accounts')
      .select(`
        id, account_number, account_name, bank_name,
        is_active, created_at, buyer_id,
        buyers ( id, full_name, phone, email )
      `)
      .eq('company_id', staff.company_id)
      .order('created_at', { ascending: false })

    const vas = (vasRaw ?? []) as VARow[]

    rows = vas.map((va) => ({
      buyerId: va.buyer_id,
      buyerName: va.buyers?.full_name ?? '—',
      phone: va.buyers?.phone ?? '—',
      email: va.buyers?.email ?? null,
      accountNumber: va.account_number,
      accountName: va.account_name,
      bankName: va.bank_name,
      isActive: va.is_active,
      totalReceived: 0,
      createdAt: va.created_at,
    }))
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Accounts</h1>
          <p className="text-gray-500 mt-1 text-sm flex items-center gap-2">
            {rows.length} virtual account{rows.length !== 1 ? 's' : ''} assigned
            {VA_DEMO_MODE && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                Demo mode
              </span>
            )}
            {!VA_DEMO_MODE && hasPaystack && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Connected
              </span>
            )}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No virtual accounts yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Virtual accounts are created when sales are registered
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Account
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Buyer
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Phone
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Received
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Sale
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr
                  key={row.buyerId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/virtual-accounts/${row.buyerId}`}
                      className="block"
                    >
                      <p className="text-sm font-mono font-medium text-gray-900">
                        {row.accountNumber}
                      </p>
                      <p className="text-xs text-gray-400">{row.bankName}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/virtual-accounts/${row.buyerId}`}
                      className="block"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {row.buyerName}
                      </p>
                      <p className="text-xs text-gray-400">{row.accountName}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-600">{row.phone}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-600 truncate max-w-32">
                      {row.email ?? '—'}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-green-600">
                      {formatNaira(row.totalReceived)}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/sales/${row.buyerId}`}
                      className="text-xs text-brand-500 hover:underline font-mono"
                    >
                      {row.buyerId.slice(0, 8)}…
                    </Link>
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