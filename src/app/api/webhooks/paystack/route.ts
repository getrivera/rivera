import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

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

  const event = JSON.parse(body) as {
    event: string
    data: {
      reference: string
      status: string
      amount: number
      metadata: {
        company_id: string
        payment_type: string
        plan_slug?: string
        billing_cycle?: string
        invoice_id?: string
      }
    }
  }

  const adminClient = createAdminClient()

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data

    // Update payment record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('company_payments')
      .update({ status: 'success', paid_at: new Date().toISOString() })
      .eq('paystack_reference', reference)

    if (metadata.payment_type === 'subscription') {
      // Activate subscription
      const now = new Date()
      const periodEnd = new Date(now)

      if (metadata.billing_cycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      } else if (metadata.billing_cycle === 'quarterly') {
        periodEnd.setMonth(periodEnd.getMonth() + 3)
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('company_subscriptions')
        .update({
          status: 'active',
          plan_slug: metadata.plan_slug,
          billing_cycle: metadata.billing_cycle,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          grace_period_ends_at: null,
        })
        .eq('company_id', metadata.company_id)
    }

    if (metadata.payment_type === 'addon' && metadata.invoice_id) {
      // Mark invoice as paid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('rivera_invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', metadata.invoice_id)

      // Mark addon charges as paid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('company_addon_charges')
        .update({ status: 'paid' })
        .eq('rivera_invoice_id', metadata.invoice_id)
    }
  }

  return NextResponse.json({ ok: true })
}