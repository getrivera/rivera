import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate } from '@/lib/utils'
import { InvoiceActions } from './invoice-actions'
import { CopyButton } from './copy-button'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'

type StaffRecord = { company_id: string; role: string }

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_kobo: number
  amount_paid_kobo: number
  sent_at: string | null
  voided_at: string | null
  void_reason: string | null
  public_token: string
  created_at: string
  buyer_id: string
  pdf_url: string | null
}

type Buyer = {
  id: string
  full_name: string
  phone: string
  email: string | null
  listing_id: string
}

type Listing = {
  id: string
  title: string
  price_kobo: number
}

type InstallmentPlan = {
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_amount_kobo: number
  installment_count: number
}

type Receipt = {
  id: string
  receipt_number: string
  amount_kobo: number
  issued_at: string
}

type Company = {
  name: string
  logo_url: string | null
  brand_colour: string | null
  rc_number: string | null
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-500',
}

export default async function InvoiceDetailPage({
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

  const { data: invoiceRaw } = await supabase
    .from('buyer_invoices')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', staff.company_id)
    .single()

  if (!invoiceRaw) notFound()
  const invoice = invoiceRaw as Invoice

  // Buyer first (listing/plan depend on it), then everything else in parallel
  const { data: buyerRaw } = await supabase
    .from('buyers')
    .select('id, full_name, phone, email, listing_id, installment_plan_id')
    .eq('id', invoice.buyer_id)
    .single()

  const buyer = buyerRaw as (Buyer & { installment_plan_id: string | null }) | null

  const [listingRes, planRes, receiptsRes, companyRes] = await Promise.all([
    buyer
      ? supabase
          .from('listings')
          .select('id, title, price_kobo')
          .eq('id', buyer.listing_id)
          .single()
      : Promise.resolve({ data: null }),
    buyer?.installment_plan_id
      ? supabase
          .from('installment_plans')
          .select('name, duration_months, deposit_amount_kobo, installment_amount_kobo, installment_count')
          .eq('id', buyer.installment_plan_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('invoice_receipts')
      .select('id, receipt_number, amount_kobo, issued_at')
      .eq('buyer_invoice_id', invoice.id)
      .order('issued_at', { ascending: false }),
    supabase
      .from('companies')
      .select('name, logo_url, brand_colour, rc_number')
      .eq('id', staff.company_id)
      .single(),
  ])

  const listing = listingRes.data as Listing | null
  const plan = planRes.data as InstallmentPlan | null
  const receipts = (receiptsRes.data ?? []) as Receipt[]
  const company = companyRes.data as Company | null

  const canManage = ['admin', 'manager', 'finance'].includes(staff.role)
  const balance = invoice.total_kobo - invoice.amount_paid_kobo
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.public_token}`

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/invoices"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to invoices
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {invoice.invoice_number}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {invoice.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Created {formatDate(invoice.created_at)}
              {invoice.sent_at && ` · Sent ${formatDate(invoice.sent_at)}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink size={14} />
              View public
            </a>

            {canManage && (
              <InvoiceActions
                invoiceId={invoice.id}
                currentStatus={invoice.status}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — invoice preview */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Branded header */}
            <div
              className="p-6 text-white"
              style={{ backgroundColor: company?.brand_colour ?? '#1B4F72' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {company?.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">
                      {company?.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg">{company?.name}</p>
                    {company?.rc_number && (
                      <p className="text-xs text-white/70">RC {company.rc_number}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/70 uppercase tracking-wider">Invoice</p>
                  <p className="font-mono font-bold text-lg">{invoice.invoice_number}</p>
                </div>
              </div>
            </div>

            {/* Invoice body */}
            <div className="p-6 space-y-6">
              {/* Bill to */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Bill to
                </p>
                <p className="font-semibold text-gray-900">{buyer?.full_name}</p>
                <p className="text-sm text-gray-500">{buyer?.phone}</p>
                {buyer?.email && (
                  <p className="text-sm text-gray-500">{buyer.email}</p>
                )}
              </div>

              {/* Line items */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Items
                </p>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                          Description
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {plan ? (
                        <>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {listing?.title} — Initial deposit ({plan.name})
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {formatNaira(plan.deposit_amount_kobo)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {plan.installment_count} installments × {formatNaira(plan.installment_amount_kobo)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {formatNaira(plan.installment_amount_kobo * plan.installment_count)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {listing?.title} — Outright purchase
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatNaira(invoice.total_kobo)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                          Total
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                          {formatNaira(invoice.total_kobo)}
                        </td>
                      </tr>
                      {invoice.amount_paid_kobo > 0 && (
                        <>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              Amount paid
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                              -{formatNaira(invoice.amount_paid_kobo)}
                            </td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                              Balance due
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                              {formatNaira(balance)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Void reason */}
              {invoice.void_reason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <p className="text-xs font-medium text-red-600 mb-1">Void reason</p>
                  <p className="text-sm text-red-700">{invoice.void_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment receipts */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              Payment receipts ({receipts.length})
            </h2>
            {receipts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No payments recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                  >
                    <div>
                      <p className="text-sm font-mono font-medium text-gray-800">
                        {receipt.receipt_number}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(receipt.issued_at)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-green-600">
                      {formatNaira(receipt.amount_kobo)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — summary */}
        <div className="space-y-4">
          {/* Payment summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Payment summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">
                  {formatNaira(invoice.total_kobo)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="font-medium text-green-600">
                  {formatNaira(invoice.amount_paid_kobo)}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Balance due</span>
                <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNaira(balance)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((invoice.amount_paid_kobo / invoice.total_kobo) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right">
                {Math.round((invoice.amount_paid_kobo / invoice.total_kobo) * 100)}% paid
              </p>
            </div>
          </div>

          {/* Sale link */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Sale</h2>
            <Link
              href={`/sales/${invoice.buyer_id}`}
              className="text-sm text-brand-500 hover:underline"
            >
              View sale details →
            </Link>
          </div>

          {/* Public link */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-2">Shareable link</h2>
            <p className="text-xs text-gray-400 mb-3">
              Share this link with the buyer — no login required
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-500 truncate"
              />
              <CopyButton text={publicUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}