// Paystack integration — stub until keys are added

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY

type PaystackResponse<T> = {
  status: boolean
  message: string
  data: T
}

type InitializeTransactionData = {
  authorization_url: string
  access_code: string
  reference: string
}

export async function initializeTransaction({
  email,
  amountKobo,
  reference,
  metadata,
  callbackUrl,
}: {
  email: string
  amountKobo: number
  reference: string
  metadata?: Record<string, unknown>
  callbackUrl?: string
}): Promise<{ url: string; reference: string } | null> {
  if (!PAYSTACK_SECRET) {
    console.warn('PAYSTACK_SECRET_KEY not set — payment stub')
    return { url: '/billing?demo=true', reference }
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo, // Paystack uses kobo already
        reference,
        metadata,
        callback_url: callbackUrl,
      }),
    })

    const data = await response.json() as PaystackResponse<InitializeTransactionData>
    if (!data.status) return null

    return {
      url: data.data.authorization_url,
      reference: data.data.reference,
    }
  } catch (err) {
    console.error('PAYSTACK INITIALIZE FAILED:', err)
    return null
  }
}

export async function verifyTransaction(reference: string): Promise<{
  status: string
  amount: number
  email: string
  metadata: Record<string, unknown>
} | null> {
  if (!PAYSTACK_SECRET) {
    console.warn('PAYSTACK_SECRET_KEY not set — verification stub')
    return null
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    )

    const data = await response.json() as PaystackResponse<{
      status: string
      amount: number
      customer: { email: string }
      metadata: Record<string, unknown>
    }>

    if (!data.status) return null

    return {
      status: data.data.status,
      amount: data.data.amount,
      email: data.data.customer.email,
      metadata: data.data.metadata,
    }
  } catch (err) {
    console.error('PAYSTACK VERIFY FAILED:', err)
    return null
  }
}

export function generateReference(prefix = 'RIV'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}