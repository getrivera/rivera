import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoicesClient } from './invoices-client'
import Link from 'next/link'

type StaffRecord = { company_id: string; role: string }

export type InvoiceRow = {
  id: string
  invoice_number: string
  status: string
  total_kobo: number
  amount_paid_kobo: number
  sent_at: string | null
  created_at: string
  buyer_name: string
  buyer_id: string
  listing_title: string
}

export default async function InvoicesPage() {
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

  const { data: invoicesRaw } = await supabase
    .from('buyer_invoices')
    .select(`
      id,
      invoice_number,
      status,
      total_kobo,
      amount_paid_kobo,
      sent_at,
      created_at,
      buyer_id,
      buyers ( full_name, listing_id, listings ( title ) )
    `)
    .eq('company_id', staff.company_id)
    .order('created_at', { ascending: false })
    .limit(500)

  type InvoiceRaw = {
    id: string
    invoice_number: string
    status: string
    total_kobo: number
    amount_paid_kobo: number
    sent_at: string | null
    created_at: string
    buyer_id: string
    buyers: {
      full_name: string
      listing_id: string
      listings: { title: string } | null
    } | null
  }

  const invoices = (invoicesRaw ?? []) as InvoiceRaw[]

  const invoiceRows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status,
    total_kobo: inv.total_kobo,
    amount_paid_kobo: inv.amount_paid_kobo,
    sent_at: inv.sent_at,
    created_at: inv.created_at,
    buyer_id: inv.buyer_id,
    buyer_name: inv.buyers?.full_name ?? 'Unknown',
    listing_title: inv.buyers?.listings?.title ?? 'Unknown listing',
  }))

  const canManage = ['admin', 'manager', 'finance'].includes(staff.role)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {invoiceRows.length} invoice{invoiceRows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <InvoicesClient invoices={invoiceRows} canManage={canManage} />
    </div>
  )
}