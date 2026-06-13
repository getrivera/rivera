import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/utils'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_kobo: number
  amount_paid_kobo: number
  created_at: string
  sent_at: string | null
  buyer_id: string
  company_id: string
}

type Buyer = {
  full_name: string
  phone: string
  email: string | null
  listing_id: string
  installment_plan_id: string | null
}

type VA = {
  account_number: string
  account_name: string
  bank_name: string
} | null

export default async function PublicInvoicePage({
  params,
}: {
  params: { token: string }
}) {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRaw } = await (adminClient as any)
    .from('buyer_invoices')
    .select('*')
    .eq('public_token', params.token)
    .single()

  if (!invoiceRaw) notFound()
  const invoice = invoiceRaw as Invoice

  // VA, buyer, company and receipts are independent — fetch in parallel
  const [vaRes, buyerRes, companyRes, receiptsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('virtual_accounts')
      .select('account_number, account_name, bank_name')
      .eq('buyer_id', invoice.buyer_id)
      .eq('is_active', true)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('buyers')
      .select('full_name, phone, email, listing_id, installment_plan_id')
      .eq('id', invoice.buyer_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('companies')
      .select('name, logo_url, brand_colour, rc_number')
      .eq('id', invoice.company_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('invoice_receipts')
      .select('receipt_number, amount_kobo, issued_at')
      .eq('buyer_invoice_id', invoice.id)
      .order('issued_at', { ascending: false }),
  ])

  const va = vaRes.data as VA
  const buyer = buyerRes.data as Buyer | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingRaw } = buyer ? await (adminClient as any)
    .from('listings')
    .select('title, price_kobo')
    .eq('id', buyer.listing_id)
    .single() : { data: null }

  const listing = listingRaw as { title: string; price_kobo: number } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: planRaw } = buyer?.installment_plan_id ? await (adminClient as any)
    .from('installment_plans')
    .select('name, duration_months, deposit_amount_kobo, installment_amount_kobo, installment_count')
    .eq('id', buyer.installment_plan_id)
    .single() : { data: null }

  const plan = planRaw as {
    name: string
    duration_months: number
    deposit_amount_kobo: number
    installment_amount_kobo: number
    installment_count: number
  } | null

  const company = companyRes.data as {
    name: string
    logo_url: string | null
    brand_colour: string | null
    rc_number: string | null
  } | null

  const receipts = (receiptsRes.data ?? []) as {
    receipt_number: string
    amount_kobo: number
    issued_at: string
  }[]

  const balance = invoice.total_kobo - invoice.amount_paid_kobo
  const brandColour = company?.brand_colour ?? '#1B4F72'

  const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    partially_paid: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-500',
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Branded header */}
          <div
            className="p-8 text-white"
            style={{ backgroundColor: brandColour }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                    {company?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-xl">{company?.name}</p>
                  {company?.rc_number && (
                    <p className="text-sm text-white/70">RC {company.rc_number}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Invoice</p>
                <p className="font-mono font-bold text-xl">{invoice.invoice_number}</p>
                <span
                  className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_STYLES[invoice.status] ?? 'bg-white/20 text-white'
                  }`}
                >
                  {invoice.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-8">
            {/* Bill to */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Bill to
              </p>
              <p className="font-semibold text-gray-900 text-lg">{buyer?.full_name}</p>
              <p className="text-gray-500">{buyer?.phone}</p>
              {buyer?.email && <p className="text-gray-500">{buyer.email}</p>}
            </div>

            {/* Date */}
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Issue date
                </p>
                <p className="text-sm text-gray-700">{formatDate(invoice.created_at)}</p>
              </div>
              {invoice.sent_at && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Sent date
                  </p>
                  <p className="text-sm text-gray-700">{formatDate(invoice.sent_at)}</p>
                </div>
              )}
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Items
              </p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                        Description
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {plan ? (
                      <>
                        <tr>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {listing?.title} — Initial deposit ({plan.name})
                          </td>
                          <td className="px-5 py-4 text-sm text-right font-medium text-gray-900">
                            {formatNaira(plan.deposit_amount_kobo)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {plan.installment_count} monthly installments × {formatNaira(plan.installment_amount_kobo)}
                          </td>
                          <td className="px-5 py-4 text-sm text-right font-medium text-gray-900">
                            {formatNaira(plan.installment_amount_kobo * plan.installment_count)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {listing?.title} — Outright purchase
                        </td>
                        <td className="px-5 py-4 text-sm text-right font-medium text-gray-900">
                          {formatNaira(invoice.total_kobo)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-5 py-3 text-sm font-bold text-gray-700">Total</td>
                      <td className="px-5 py-3 text-sm text-right font-bold text-gray-900">
                        {formatNaira(invoice.total_kobo)}
                      </td>
                    </tr>
                    {invoice.amount_paid_kobo > 0 && (
                      <>
                        <tr>
                          <td className="px-5 py-3 text-sm text-gray-500">Amount paid</td>
                          <td className="px-5 py-3 text-sm text-right text-green-600 font-medium">
                            -{formatNaira(invoice.amount_paid_kobo)}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-5 py-3 text-sm font-bold text-gray-700">
                            Balance due
                          </td>
                          <td
                            className="px-5 py-3 text-sm text-right font-bold text-lg"
                            style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}
                          >
                            {formatNaira(balance)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Virtual account payment details */}
            {va && (
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Payment details
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Transfer the exact amount to this dedicated account number.
                  Your payment will be automatically recorded.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium text-gray-900">{va.bank_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account number</span>
                    <span className="font-bold text-gray-900 font-mono text-lg">
                      {va.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account name</span>
                    <span className="font-medium text-gray-900">{va.account_name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment receipts */}
            {receipts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Payment history
                </p>
                <div className="space-y-2">
                  {receipts.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100"
                    >
                      <div>
                        <p className="text-sm font-mono font-medium text-gray-800">
                          {r.receipt_number}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(r.issued_at)}</p>
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        {formatNaira(r.amount_kobo)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Powered by Rivera · Real estate partner management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}