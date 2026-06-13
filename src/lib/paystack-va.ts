export const VA_ENABLED = process.env.NEXT_PUBLIC_VA_ENABLED === 'true'

type PaystackResponse<T> = {
  status: boolean
  message: string
  data: T
}

type VAData = {
  id: number
  account_name: string
  account_number: string
  assigned: boolean
  currency: string
  metadata: Record<string, unknown>
  active: boolean
  assigned_to: {
    email: string
    name: string
    phone: string
  }
  bank: {
    name: string
    id: number
    slug: string
  }
}

type CreateVAParams = {
  email: string
  firstName: string
  lastName: string
  phone: string
  preferredBank: 'wema-bank' | 'titan-paystack'
  metadata?: Record<string, unknown>
  secretKey?: string // optional override — company's own key
}

export async function createVirtualAccount(params: CreateVAParams): Promise<{
  accountNumber: string
  accountName: string
  bankName: string
  bankSlug: string
  paystackAccountId: string
} | null> {
  const key = params.secretKey ?? process.env.PAYSTACK_SECRET_KEY

  if (!key) {
    console.error('PAYSTACK_VA: No secret key available')
    return null
  }

  try {
    // Step 1 — Create customer
    console.log('PAYSTACK_VA: Creating customer for', params.email)

    const customerRes = await fetch('https://api.paystack.co/customer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone: params.phone,
        metadata: params.metadata,
      }),
    })

    const customerData = await customerRes.json() as PaystackResponse<{
      customer_code: string
      id: number
    }>

    console.log('PAYSTACK_VA: Customer response:', JSON.stringify({
      status: customerData.status,
      message: customerData.message,
      customer_code: customerData.data?.customer_code,
    }))

    if (!customerData.status) {
      console.error('PAYSTACK_VA: Customer creation failed:', customerData.message)
      return null
    }

    const customerCode = customerData.data.customer_code

    // Step 2 — Assign dedicated VA
    console.log('PAYSTACK_VA: Assigning VA for customer', customerCode, 'bank:', params.preferredBank)

    const vaRes = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: params.preferredBank,
      }),
    })

    const vaData = await vaRes.json() as PaystackResponse<VAData>

    console.log('PAYSTACK_VA: VA response:', JSON.stringify({
      status: vaData.status,
      message: vaData.message,
      account_number: vaData.data?.account_number,
      bank: vaData.data?.bank?.name,
    }))

    if (!vaData.status) {
      console.error('PAYSTACK_VA: VA assignment failed:', vaData.message)
      return null
    }

    return {
      accountNumber: vaData.data.account_number,
      accountName: vaData.data.account_name,
      bankName: vaData.data.bank.name,
      bankSlug: vaData.data.bank.slug,
      paystackAccountId: String(vaData.data.id),
    }
  } catch (err) {
    console.error('PAYSTACK_VA: Exception:', err)
    return null
  }
}