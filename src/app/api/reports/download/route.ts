import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type StaffRecord = { company_id: string; role: string }

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ]

  return lines.join('\n')
}

function formatNaira(kobo: number): string {
  return (kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  })
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  const staff = staffData as StaffRecord

  let csv = ''
  let filename = 'report.csv'

  // ── Sales summary ──────────────────────────────────────────────────────
  if (type === 'sales') {
    const { data: salesRaw } = await supabase
      .from('buyers')
      .select(`
        id, full_name, phone, email, status, source, unit_quantity, created_at,
        listings ( title, location_city, location_state ),
        partners ( full_name, email )
      `)
      .eq('company_id', staff.company_id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    type Sale = {
      id: string
      full_name: string
      phone: string
      email: string | null
      status: string
      source: string
      unit_quantity: number
      created_at: string
      listings: { title: string; location_city: string; location_state: string } | null
      partners: { full_name: string; email: string } | null
    }

    const sales = (salesRaw ?? []) as Sale[]

    const headers = [
      'Date',
      'Buyer name',
      'Phone',
      'Email',
      'Listing',
      'Location',
      'Units',
      'Source',
      'Partner',
      'Partner email',
      'Status',
    ]

    const rows = sales.map((s) => [
      formatDate(s.created_at),
      s.full_name,
      s.phone,
      s.email ?? '',
      s.listings?.title ?? '',
      s.listings ? `${s.listings.location_city}, ${s.listings.location_state}` : '',
      String(s.unit_quantity ?? 1),
      s.source,
      s.partners?.full_name ?? '',
      s.partners?.email ?? '',
      s.status.replace(/_/g, ' '),
    ])

    csv = toCSV(headers, rows)
    filename = `sales-summary-${new Date().toISOString().slice(0, 10)}.csv`
  }

  // ── Commission report ──────────────────────────────────────────────────
  else if (type === 'commissions') {
    const { data: commissionsRaw } = await supabase
      .from('commissions')
      .select(`
        id, amount_kobo, status, trigger_event, triggered_at, paid_at,
        partners ( full_name, email, phone ),
        listings ( title ),
        buyers ( full_name )
      `)
      .eq('company_id', staff.company_id)
      .order('triggered_at', { ascending: false, nullsFirst: false })

    type Commission = {
      id: string
      amount_kobo: number
      status: string
      trigger_event: string
      triggered_at: string | null
      paid_at: string | null
      partners: { full_name: string; email: string; phone: string } | null
      listings: { title: string } | null
      buyers: { full_name: string } | null
    }

    const commissions = (commissionsRaw ?? []) as Commission[]

    const headers = [
      'Partner name',
      'Partner email',
      'Partner phone',
      'Buyer',
      'Listing',
      'Amount',
      'Status',
      'Trigger',
      'Triggered date',
      'Paid date',
    ]

    const rows = commissions.map((c) => [
      c.partners?.full_name ?? '',
      c.partners?.email ?? '',
      c.partners?.phone ?? '',
      c.buyers?.full_name ?? '',
      c.listings?.title ?? '',
      formatNaira(c.amount_kobo),
      c.status,
      c.trigger_event,
      c.triggered_at ? formatDate(c.triggered_at) : '',
      c.paid_at ? formatDate(c.paid_at) : '',
    ])

    csv = toCSV(headers, rows)
    filename = `commissions-${new Date().toISOString().slice(0, 10)}.csv`
  }

  // ── Invoice report ─────────────────────────────────────────────────────
  else if (type === 'invoices') {
    const { data: invoicesRaw } = await supabase
      .from('buyer_invoices')
      .select(`
        id, invoice_number, status, total_kobo, amount_paid_kobo, sent_at, created_at,
        buyers ( full_name, phone, email )
      `)
      .eq('company_id', staff.company_id)
      .order('created_at', { ascending: false })

    type Invoice = {
      id: string
      invoice_number: string
      status: string
      total_kobo: number
      amount_paid_kobo: number
      sent_at: string | null
      created_at: string
      buyers: { full_name: string; phone: string; email: string | null } | null
    }

    const invoices = (invoicesRaw ?? []) as Invoice[]

    const headers = [
      'Invoice number',
      'Date',
      'Buyer name',
      'Buyer phone',
      'Buyer email',
      'Total',
      'Amount paid',
      'Outstanding',
      'Status',
      'Sent date',
    ]

    const rows = invoices.map((i) => [
      i.invoice_number,
      formatDate(i.created_at),
      i.buyers?.full_name ?? '',
      i.buyers?.phone ?? '',
      i.buyers?.email ?? '',
      formatNaira(i.total_kobo),
      formatNaira(i.amount_paid_kobo),
      formatNaira(i.total_kobo - i.amount_paid_kobo),
      i.status.replace(/_/g, ' '),
      i.sent_at ? formatDate(i.sent_at) : '',
    ])

    csv = toCSV(headers, rows)
    filename = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
  }

  // ── Partner leaderboard ────────────────────────────────────────────────
  else if (type === 'leaderboard') {
    const { data: commissionsRaw } = await supabase
      .from('commissions')
      .select('partner_id, amount_kobo, status')
      .eq('company_id', staff.company_id)

    type CommRow = { partner_id: string; amount_kobo: number; status: string }
    const commissions = (commissionsRaw ?? []) as CommRow[]

    const partnerMap: Record<string, { sales_count: number; commission_earned: number }> = {}
    commissions.forEach((c) => {
      if (!partnerMap[c.partner_id]) {
        partnerMap[c.partner_id] = { sales_count: 0, commission_earned: 0 }
      }
      partnerMap[c.partner_id].sales_count += 1
      if (c.status === 'paid') {
        partnerMap[c.partner_id].commission_earned += c.amount_kobo
      }
    })

    const partnerIds = Object.keys(partnerMap)
    const { data: partnersRaw } = partnerIds.length
      ? await supabase
          .from('partners')
          .select('id, full_name, email, phone')
          .in('id', partnerIds)
      : { data: [] }

    type Partner = { id: string; full_name: string; email: string; phone: string }
    const partners = (partnersRaw ?? []) as Partner[]

    const leaderboard = partners
      .map((p) => ({
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        sales_count: partnerMap[p.id]?.sales_count ?? 0,
        commission_earned: partnerMap[p.id]?.commission_earned ?? 0,
      }))
      .sort((a, b) => b.sales_count - a.sales_count)
      .map((p, i) => ({ rank: i + 1, ...p }))

    const headers = [
      'Rank',
      'Partner name',
      'Email',
      'Phone',
      'Total sales',
      'Commission earned',
    ]

    const rows = leaderboard.map((p) => [
      String(p.rank),
      p.full_name,
      p.email,
      p.phone,
      String(p.sales_count),
      formatNaira(p.commission_earned),
    ])

    csv = toCSV(headers, rows)
    filename = `partner-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
  }

  // ── Partner list ───────────────────────────────────────────────────────
  else if (type === 'partners') {
    const { data: pcRaw } = await supabase
      .from('partner_companies')
      .select(`
        id, status, join_method, created_at,
        partners ( id, full_name, email, phone, bank_name, bank_account_number, bank_account_name )
      `)
      .eq('company_id', staff.company_id)
      .order('created_at', { ascending: false })

    type PartnerCompany = {
      id: string
      status: string
      join_method: string
      created_at: string
      partners: {
        id: string
        full_name: string
        email: string
        phone: string
        bank_name: string | null
        bank_account_number: string | null
        bank_account_name: string | null
      } | null
    }

    const partnerCompanies = (pcRaw ?? []) as PartnerCompany[]

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Status',
      'Join method',
      'Date joined',
      'Bank name',
      'Account number',
      'Account name',
    ]

    const rows = partnerCompanies.map((pc) => [
      pc.partners?.full_name ?? '',
      pc.partners?.email ?? '',
      pc.partners?.phone ?? '',
      pc.status,
      pc.join_method.replace(/_/g, ' '),
      formatDate(pc.created_at),
      pc.partners?.bank_name ?? '',
      pc.partners?.bank_account_number ?? '',
      pc.partners?.bank_account_name ?? '',
    ])

    csv = toCSV(headers, rows)
    filename = `partner-list-${new Date().toISOString().slice(0, 10)}.csv`
  }

  else {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}