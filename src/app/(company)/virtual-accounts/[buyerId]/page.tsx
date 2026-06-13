import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/utils'
import { VA_DEMO_MODE, getDemoVA, getDemoTransactions } from '@/lib/va-demo'
import { VA_ENABLED } from '@/lib/paystack-va'
import { hasCompanyPaystackConfig } from '@/lib/paystack-company'
import Link from 'next/link'
import { ChevronLeft, CreditCard } from 'lucide-react'
import { CopyButton } from './copy-button'

type StaffRecord = { company_id: string; role: string }

type Transaction = {
  id: string
  amount_kobo: number
  narration: string | null
  paystack_reference: string
  paid_at: string | null
  created_at: string
}

export default async function VADetailPage({
  params,
}: {
  params: { buyerId: string }
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

  const adminClient = createAdminClient()

  // Get buyer — must belong to this company
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buyerRaw } = await (adminClient as any)
    .from('buyers')
    .select('id, full_name, phone, email, company_id, created_at')
    .eq('id', params.buyerId)
    .eq('company_id', staff.company_id)
    .single()

  if (!buyerRaw) notFound()

  const buyer = buyerRaw as {
    id: string
    full_name: string
    phone: string
    email: string | null
    company_id: string
    created_at: string
  }

  let va: {
    account_number: string
    account_name: string
    bank_name: string
    is_active: boolean
    is_demo?: boolean
  } | null = null

  let transactions: Transaction[] = []
  let isDemo = false

  if (VA_DEMO_MODE) {
    // Demo mode — show hardcoded VA and dummy transactions
    va = getDemoVA(params.buyerId)
    transactions = getDemoTransactions(params.buyerId)
    isDemo = true
  } else {
    const hasOwnConfig = await hasCompanyPaystackConfig(staff.company_id)
    const canUseVA = hasOwnConfig || VA_ENABLED

    if (canUseVA) {
      // Real VA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vaRaw } = await (adminClient as any)
        .from('virtual_accounts')
        .select('id, account_number, account_name, bank_name, is_active, created_at')
        .eq('buyer_id', params.buyerId)
        .eq('company_id', staff.company_id)
        .eq('is_active', true)
        .single()

      va = vaRaw

      if (va && vaRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: txRaw } = await (adminClient as any)
          .from('va_transactions')
          .select('id, amount_kobo, narration, paystack_reference, paid_at, created_at')
          .eq('virtual_account_id', (vaRaw as { id: string }).id)
          .order('paid_at', { ascending: false })

        transactions = (txRaw ?? []) as Transaction[]
      }
    }
  }

  const totalReceived = transactions.reduce((sum, tx) => sum + tx.amount_kobo, 0)

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/virtual-accounts"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to virtual accounts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{buyer.full_name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{buyer.phone}</p>
            {buyer.email && (
              <p className="text-gray-400 text-xs mt-0.5">{buyer.email}</p>
            )}
          </div>
          <Link
            href={`/sales/${buyer.id}`}
            className="text-xs text-brand-500 hover:underline flex-shrink-0"
          >
            View sale →
          </Link>
        </div>
      </div>

      {!va ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No virtual account assigned</p>
          <p className="text-gray-400 text-sm mt-1">
            Go to the sale page to create a virtual account for this buyer
          </p>
          <Link
            href={`/sales/${buyer.id}`}
            className="mt-4 inline-block text-sm text-brand-500 hover:underline"
          >
            Go to sale →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* VA card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-brand-500 p-6 text-white">
              {isDemo && (
                <div className="mb-3 px-2 py-1 bg-yellow-400/20 border border-yellow-300/30 rounded text-xs text-yellow-200 font-medium inline-block">
                  Demo mode — sample account
                </div>
              )}
              <p className="text-sm text-white/70 mb-1 uppercase tracking-wide">
                {va.bank_name}
              </p>
              <p className="text-3xl font-mono font-bold tracking-wider mb-1">
                {va.account_number}
              </p>
              <p className="text-white/80 text-sm">{va.account_name}</p>
            </div>

            <div className="p-4 flex items-center justify-between bg-gray-50 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Total received</p>
                <p className="text-xl font-bold text-green-600">
                  {formatNaira(totalReceived)}
                </p>
              </div>
              <CopyButton text={va.account_number} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Transactions</p>
              <p className="text-xl font-bold text-gray-900">{transactions.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total received</p>
              <p className="text-xl font-bold text-green-600">
                {formatNaira(totalReceived)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                va.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {va.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Transactions table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Payment history</h2>
              <span className="text-xs text-gray-400">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No payments received yet</p>
                <p className="text-gray-300 text-xs mt-1">
                  Payments will appear here automatically when the buyer transfers
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Narration
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Reference
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-green-600">
                          +{formatNaira(tx.amount_kobo)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-700">
                          {tx.narration ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-mono text-gray-400 truncate max-w-32">
                          {tx.paystack_reference}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {tx.paid_at
                            ? formatDate(tx.paid_at)
                            : formatDate(tx.created_at)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-3 text-sm font-bold text-gray-700">
                      Total
                    </td>
                    <td colSpan={3} className="px-5 py-3 text-sm font-bold text-green-600">
                      {formatNaira(totalReceived)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}