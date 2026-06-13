import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// Paystack Virtual Account webhook
//
// Key fixes vs the previous version (these were why invoices never moved to
// partially_paid on real VA transfers):
//
// 1. Only `charge.success` is treated as a payment.
//    `dedicatedaccount.assign.success` is an ACCOUNT ASSIGNMENT event — it has
//    no payment amount and was previously being run through the payment path.
//
// 2. The receiving account number is resolved from every location Paystack
//    puts it in, depending on event shape:
//      data.dedicated_account.account_number      (assignment-style payloads)
//      data.authorization.receiver_bank_account_number (dedicated NUBAN charges)
//      data.metadata.receiver_account_number      (some charge payloads)
//    Previously only the first was checked, so dedicated NUBAN charge events
//    found no VA and were silently dropped.
//
// 3. Inserts/updates are error-checked and logged instead of fire-and-forget.
//
// 4. A buyer's first payment moves them pending_deposit → on_track (they used
//    to stay "pending deposit" until fully paid).
// ─────────────────────────────────────────────────────────────────────────────

type ChargeSuccessData = {
  id: number
  amount: number
  currency: string
  reference: string
  narration?: string
  channel?: string
  paid_at?: string
  dedicated_account?: {
    account_number?: string
    account_name?: string
    bank?: { name?: string; slug?: string }
  }
  authorization?: {
    channel?: string
    receiver_bank_account_number?: string
    receiver_bank?: string
    sender_name?: string
  }
  metadata?: {
    receiver_account_number?: string
    [key: string]: unknown
  }
}

function resolveAccountNumber(data: ChargeSuccessData): string | null {
  return (
    data.dedicated_account?.account_number ??
    data.authorization?.receiver_bank_account_number ??
    data.metadata?.receiver_account_number ??
    null
  )
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 400 })
  }

  const body = await req.text()
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex')

  const signature = req.headers.get('x-paystack-signature')
  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body) as { event: string; data: ChargeSuccessData }

  // Only actual payments. Assignment events carry no payment amount.
  if (event.event !== 'charge.success') {
    return NextResponse.json({ ok: true })
  }

  const adminClient = createAdminClient()
  const { data: eventData } = event

  if (!eventData.amount || eventData.amount <= 0) {
    return NextResponse.json({ ok: true })
  }

  const accountNumber = resolveAccountNumber(eventData)
  if (!accountNumber) {
    console.error('VA WEBHOOK: charge.success without resolvable account number', {
      reference: eventData.reference,
      channel: eventData.channel ?? eventData.authorization?.channel,
    })
    return NextResponse.json({ ok: true })
  }

  // Find the virtual account by account number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vaRaw } = await (adminClient as any)
    .from('virtual_accounts')
    .select('id, buyer_id, company_id')
    .eq('account_number', accountNumber)
    .eq('is_active', true)
    .single()

  const va = vaRaw as {
    id: string
    buyer_id: string
    company_id: string
  } | null

  if (!va) {
    console.error('VA WEBHOOK: No VA found for account', accountNumber)
    return NextResponse.json({ ok: true })
  }

  // Idempotency: skip already-processed references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingTx } = await (adminClient as any)
    .from('va_transactions')
    .select('id')
    .eq('paystack_reference', eventData.reference)
    .maybeSingle()

  if (existingTx) {
    return NextResponse.json({ ok: true }) // already processed
  }

  // Record transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: txError } = await (adminClient as any)
    .from('va_transactions')
    .insert({
      virtual_account_id: va.id,
      buyer_id: va.buyer_id,
      company_id: va.company_id,
      paystack_reference: eventData.reference,
      amount_kobo: eventData.amount,
      narration: eventData.narration ?? null,
      paid_at: eventData.paid_at ?? new Date().toISOString(),
    })

  if (txError) {
    console.error('VA WEBHOOK: transaction insert failed', txError.message)
    // Return 500 so Paystack retries — nothing was recorded
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
  }

  // Auto-record payment on invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoiceRaw } = await (adminClient as any)
    .from('buyer_invoices')
    .select('id, total_kobo, amount_paid_kobo, status, buyer_id')
    .eq('buyer_id', va.buyer_id)
    .eq('company_id', va.company_id)
    .neq('status', 'voided')
    .maybeSingle()

  const invoice = invoiceRaw as {
    id: string
    total_kobo: number
    amount_paid_kobo: number
    status: string
    buyer_id: string
  } | null

  if (invoice && invoice.status !== 'paid') {
    const newAmountPaid = invoice.amount_paid_kobo + eventData.amount
    const newStatus = newAmountPaid >= invoice.total_kobo ? 'paid' : 'partially_paid'

    // Update invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: invoiceError } = await (adminClient as any)
      .from('buyer_invoices')
      .update({
        amount_paid_kobo: newAmountPaid,
        status: newStatus,
      })
      .eq('id', invoice.id)

    if (invoiceError) {
      console.error('VA WEBHOOK: invoice update failed', invoiceError.message)
    }

    // Create receipt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: receiptError } = await (adminClient as any)
      .from('invoice_receipts')
      .insert({
        company_id: va.company_id,
        buyer_invoice_id: invoice.id,
        va_transaction_id: eventData.reference,
        receipt_number: `RCP-AUTO-${Date.now()}`,
        amount_kobo: eventData.amount,
        issued_at: new Date().toISOString(),
      })

    if (receiptError) {
      console.error('VA WEBHOOK: receipt insert failed', receiptError.message)
    }

    const isFirstPayment = invoice.amount_paid_kobo === 0

    // Buyer status: full payment → fully_paid; first payment → on_track
    if (newStatus === 'paid') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('buyers')
        .update({ status: 'fully_paid' })
        .eq('id', va.buyer_id)
    } else if (isFirstPayment) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('buyers')
        .update({ status: 'on_track' })
        .eq('id', va.buyer_id)
        .eq('status', 'pending_deposit')
    }

    // Trigger commission checks
    const { checkCommissionTrigger } = await import('@/actions/commissions')
    const isFullyPaid = newStatus === 'paid'
    const isMilestone =
      invoice.amount_paid_kobo < invoice.total_kobo * 0.5 &&
      newAmountPaid >= invoice.total_kobo * 0.5

    if (isFirstPayment) await checkCommissionTrigger(va.buyer_id, va.company_id, 'deposit_received')
    if (isFullyPaid) await checkCommissionTrigger(va.buyer_id, va.company_id, 'fully_paid')
    if (isMilestone) await checkCommissionTrigger(va.buyer_id, va.company_id, 'milestone_reached')
    await checkCommissionTrigger(va.buyer_id, va.company_id, 'installment_paid')
  }

  console.log('VA WEBHOOK PROCESSED:', {
    reference: eventData.reference,
    amount: eventData.amount,
    buyer_id: va.buyer_id,
  })

  return NextResponse.json({ ok: true })
}
