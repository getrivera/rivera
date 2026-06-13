import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate } from '@/lib/utils'
import { SaleActions } from './sale-actions'
import { InvoiceWidget } from './invoice-widget'
import { ReminderWidget } from './reminder-widget'
import { SaleDocuments } from './sale-documents'
import { VAWidget } from './va-widget'
import Link from 'next/link'
import { ChevronLeft, User, Phone, Mail, FileText } from 'lucide-react'
import { getBuyerVirtualAccount, getVATransactions } from '@/actions/virtual-accounts'
import { VA_ENABLED } from '@/lib/paystack-va'
import { VA_DEMO_MODE, getDemoVA, getDemoTransactions } from '@/lib/va-demo'
import { hasCompanyPaystackConfig } from '@/lib/paystack-company'

type StaffRecord = { company_id: string; role: string }

type Sale = {
  id: string
  full_name: string
  phone: string
  email: string | null
  nin: string | null
  next_of_kin_name: string | null
  next_of_kin_phone: string | null
  notes: string | null
  source: string
  status: string
  created_at: string
  listing_id: string
  partner_id: string | null
  installment_plan_id: string | null
  unit_quantity: number | null
}

type Listing = {
  id: string
  title: string
  location_city: string
  location_state: string
  price_kobo: number
}

type InstallmentPlan = {
  id: string
  name: string
  duration_months: number
  deposit_amount_kobo: number
  installment_amount_kobo: number
  installment_count: number
}

type Partner = {
  id: string
  full_name: string
  email: string
  phone: string
}

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_kobo: number
  amount_paid_kobo: number
}

type ReminderTemplate = {
  id: string
  name: string
  trigger_type: string
}

type SaleDocument = {
  id: string
  document_type: string
  custom_label: string | null
  file_name: string
  storage_url: string
  size_bytes: number
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending_deposit: 'bg-yellow-100 text-yellow-700',
  on_track: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  fully_paid: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function SaleDetailPage({
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

  const { data: saleRaw } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', staff.company_id)
    .single()

  if (!saleRaw) notFound()
  const sale = saleRaw as Sale

  // All of these depend only on the sale row — fetch them in parallel.
  // (Previously seven sequential round-trips; on slow networks this was the
  // main reason the sale page felt heavy.)
  const [
    listingRes,
    planRes,
    partnerRes,
    pcRes,
    invoiceRes,
    templatesRes,
    documentsRes,
    hasPaystack,
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, location_city, location_state, price_kobo')
      .eq('id', sale.listing_id)
      .single(),
    sale.installment_plan_id
      ? supabase
          .from('installment_plans')
          .select('id, name, duration_months, deposit_amount_kobo, installment_amount_kobo, installment_count')
          .eq('id', sale.installment_plan_id)
          .single()
      : Promise.resolve({ data: null }),
    sale.partner_id
      ? supabase
          .from('partners')
          .select('id, full_name, email, phone')
          .eq('id', sale.partner_id)
          .single()
      : Promise.resolve({ data: null }),
    sale.partner_id
      ? supabase
          .from('partner_companies')
          .select('id')
          .eq('partner_id', sale.partner_id)
          .eq('company_id', staff.company_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('buyer_invoices')
      .select('id, invoice_number, status, total_kobo, amount_paid_kobo')
      .eq('buyer_id', params.id)
      .eq('company_id', staff.company_id)
      .neq('status', 'voided')
      .single(),
    supabase
      .from('reminder_templates')
      .select('id, name, trigger_type')
      .eq('company_id', staff.company_id)
      .eq('is_active', true)
      .order('trigger_type', { ascending: true }),
    supabase
      .from('sale_documents')
      .select('id, document_type, custom_label, file_name, storage_url, size_bytes, created_at')
      .eq('buyer_id', params.id)
      .eq('company_id', staff.company_id)
      .order('created_at', { ascending: true }),
    hasCompanyPaystackConfig(staff.company_id),
  ])

  const listing = listingRes.data as Listing | null
  const plan = planRes.data as InstallmentPlan | null
  const partner = partnerRes.data as Partner | null
  const partnerCompanyId = (pcRes.data as { id: string } | null)?.id ?? null
  const invoice = invoiceRes.data as Invoice | null
  const reminderTemplates = (templatesRes.data ?? []) as ReminderTemplate[]
  const saleDocuments = (documentsRes.data ?? []) as SaleDocument[]

  let vaData: {
    account_number: string
    account_name: string
    bank_name: string
    is_active: boolean
    is_demo?: boolean
  } | null = null

  let vaTransactions: {
    id: string
    amount_kobo: number
    narration: string | null
    paystack_reference: string
    paid_at: string | null
    created_at: string
  }[] = []

  if (VA_DEMO_MODE) {
    vaData = getDemoVA(params.id)
    vaTransactions = getDemoTransactions(params.id)
  } else if (hasPaystack || VA_ENABLED) {
    const [fetchedVA, fetchedTxs] = await Promise.all([
      getBuyerVirtualAccount(params.id),
      getVATransactions(params.id),
    ])
    vaData = fetchedVA
    vaTransactions = fetchedTxs
  }

  const canManage = ['admin', 'manager'].includes(staff.role)

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/sales"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={16} /> Back to sales
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{sale.full_name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  STATUS_STYLES[sale.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {sale.status.replace(/_/g, ' ')}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  sale.source === 'direct'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {sale.source === 'direct' ? 'Direct' : 'Referred'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Registered {formatDate(sale.created_at)}
            </p>
          </div>

          {canManage && (
            <SaleActions saleId={sale.id} currentStatus={sale.status} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Buyer info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Buyer information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={15} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{sale.full_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={15} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{sale.phone}</span>
              </div>
              {sale.email && (
                <div className="flex items-center gap-3">
                  <Mail size={15} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{sale.email}</span>
                </div>
              )}
              {sale.nin && (
                <div className="flex items-center gap-3">
                  <FileText size={15} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">NIN: {sale.nin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next of kin */}
          {(sale.next_of_kin_name || sale.next_of_kin_phone) && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Next of kin</h2>
              <div className="space-y-3">
                {sale.next_of_kin_name && (
                  <div className="flex items-center gap-3">
                    <User size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{sale.next_of_kin_name}</span>
                  </div>
                )}
                {sale.next_of_kin_phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{sale.next_of_kin_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Notes</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{sale.notes}</p>
            </div>
          )}

          {/* Land documents */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Land documents</h2>
            <SaleDocuments
              saleId={params.id}
              documents={saleDocuments}
              canManage={canManage}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Listing */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Listing</h2>
            {listing ? (
              <div className="space-y-2">
                <Link
                  href={`/listings/${listing.id}`}
                  className="text-sm font-medium text-brand-500 hover:underline block"
                >
                  {listing.title}
                </Link>
                <p className="text-xs text-gray-400">
                  {listing.location_city}, {listing.location_state}
                </p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-lg font-bold text-gray-900">
                    {formatNaira(listing.price_kobo)}
                  </p>
                  <span className="text-xs text-gray-400">per unit</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium text-gray-900">
                    {Math.max(1, sale.unit_quantity ?? 1)} unit{Math.max(1, sale.unit_quantity ?? 1) !== 1 ? 's' : ''}
                  </span>
                </div>
                {Math.max(1, sale.unit_quantity ?? 1) > 1 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Total value</span>
                    <span className="font-bold text-gray-900">
                      {formatNaira(listing.price_kobo * Math.max(1, sale.unit_quantity ?? 1))}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Listing not found</p>
            )}
          </div>

          {/* Payment plan */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Payment plan</h2>
            {plan ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-800">{plan.name}</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">{plan.duration_months} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deposit</span>
                  <span className="font-medium">{formatNaira(plan.deposit_amount_kobo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly</span>
                  <span className="font-medium">{formatNaira(plan.installment_amount_kobo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Installments</span>
                  <span className="font-medium">{plan.installment_count} payments</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Outright purchase</p>
            )}
          </div>

          {/* Partner */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Partner</h2>
            {partner ? (
              <div className="space-y-2">
                <Link
                  href={`/partners/${partnerCompanyId ?? partner.id}`}
                  className="text-sm font-medium text-brand-500 hover:underline block"
                >
                  {partner.full_name}
                </Link>
                <p className="text-xs text-gray-400">{partner.email}</p>
                <p className="text-xs text-gray-400">{partner.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Direct sale — no partner</p>
            )}
          </div>

          {/* Invoice */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Invoice</h2>
            <InvoiceWidget
              saleId={params.id}
              invoice={invoice}
              canManage={canManage}
            />
          </div>

          {/* Reminders */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Send reminder</h2>
            <ReminderWidget
              saleId={params.id}
              templates={reminderTemplates}
              canManage={canManage}
            />
          </div>

          {/* Virtual Account */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Virtual Account</h2>
            <VAWidget
              saleId={params.id}
              va={vaData}
              transactions={vaTransactions}
              canManage={canManage}
              vaEnabled={VA_ENABLED}
              hasPaystack={hasPaystack}
              demoMode={VA_DEMO_MODE}
            />
          </div>
        </div>
      </div>
    </div>
  )
}