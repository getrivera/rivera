import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { getCompanyEmailConfig } from '@/lib/email-config'
import { formatNaira } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// sendInvoiceEmail
//
// Sends (or re-sends) a branded invoice email to the buyer, including the
// amounts, balance, the public no-login invoice link, and the buyer's
// dedicated virtual account details when one exists.
//
// Returns { sent: true } on success, or { sent: false, reason } when the
// buyer has no email or the provider rejected it — callers decide whether
// that is fatal (it isn't for "mark as sent", it is for "resend").
// ─────────────────────────────────────────────────────────────────────────────

type InvoiceEmailResult = { sent: boolean; reason?: string }

export async function sendInvoiceEmail(invoiceId: string): Promise<InvoiceEmailResult> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRaw } = await (adminClient as any)
    .from('buyer_invoices')
    .select('id, invoice_number, status, total_kobo, amount_paid_kobo, public_token, buyer_id, company_id')
    .eq('id', invoiceId)
    .single()

  const invoice = invoiceRaw as {
    id: string
    invoice_number: string
    status: string
    total_kobo: number
    amount_paid_kobo: number
    public_token: string
    buyer_id: string
    company_id: string
  } | null

  if (!invoice) return { sent: false, reason: 'Invoice not found' }

  // Fetch buyer, company and VA in parallel
  const [buyerRes, companyRes, vaRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('buyers')
      .select('full_name, email, listing_id')
      .eq('id', invoice.buyer_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('companies')
      .select('name, brand_colour')
      .eq('id', invoice.company_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from('virtual_accounts')
      .select('account_number, account_name, bank_name')
      .eq('buyer_id', invoice.buyer_id)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const buyer = buyerRes.data as { full_name: string; email: string | null; listing_id: string } | null
  const company = companyRes.data as { name: string; brand_colour: string | null } | null
  const va = vaRes.data as { account_number: string; account_name: string; bank_name: string } | null

  if (!buyer) return { sent: false, reason: 'Buyer not found' }
  if (!buyer.email) return { sent: false, reason: 'Buyer has no email address on file' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingRaw } = await (adminClient as any)
    .from('listings')
    .select('title')
    .eq('id', buyer.listing_id)
    .single()

  const listingTitle = (listingRaw as { title: string } | null)?.title ?? 'your property'

  const emailConfig = await getCompanyEmailConfig(invoice.company_id)
  const brand = company?.brand_colour ?? '#1B4F72'
  const balance = invoice.total_kobo - invoice.amount_paid_kobo
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.public_token}`
  const companyName = company?.name ?? 'Your property company'

  const vaBlock = va
    ? `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Pay by bank transfer</p>
        <p style="font-size:14px;color:#111827;margin:0 0 2px;"><strong>${va.bank_name}</strong></p>
        <p style="font-size:20px;color:#111827;margin:0 0 2px;font-family:monospace;letter-spacing:0.05em;"><strong>${va.account_number}</strong></p>
        <p style="font-size:13px;color:#6b7280;margin:0;">${va.account_name}</p>
        <p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">This account is dedicated to your payments — transfers are matched automatically.</p>
      </div>`
    : ''

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
      <div style="border-bottom:3px solid ${brand};padding-bottom:16px;margin-bottom:24px;">
        <h2 style="color:${brand};margin:0;">${companyName}</h2>
        <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Invoice ${invoice.invoice_number}</p>
      </div>

      <p style="font-size:15px;color:#374151;line-height:1.6;">
        Dear ${buyer.full_name},
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.6;">
        Please find your invoice for <strong>${listingTitle}</strong> below.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#6b7280;">Total</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;"><strong>${formatNaira(invoice.total_kobo)}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#6b7280;border-top:1px solid #f3f4f6;">Paid so far</td>
          <td style="padding:8px 0;font-size:14px;color:#16a34a;text-align:right;border-top:1px solid #f3f4f6;">${formatNaira(invoice.amount_paid_kobo)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;"><strong>Balance due</strong></td>
          <td style="padding:8px 0;font-size:16px;color:${balance > 0 ? '#dc2626' : '#16a34a'};text-align:right;border-top:1px solid #e5e7eb;"><strong>${formatNaira(balance)}</strong></td>
        </tr>
      </table>

      ${vaBlock}

      <div style="text-align:center;margin:28px 0;">
        <a href="${publicUrl}"
           style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          View full invoice
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;">
        This invoice was sent by ${companyName} via Rivera.
        If you have any questions about this invoice, please contact ${companyName} directly.
      </p>
    </div>
  `

  const result = await sendEmail({
    to: buyer.email,
    from: emailConfig.displayFrom,
    subject: `Invoice ${invoice.invoice_number} — ${listingTitle}`,
    html,
  })

  if (!result.success) {
    return { sent: false, reason: result.error ?? 'Email provider rejected the message' }
  }

  return { sent: true }
}
