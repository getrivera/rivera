export const VA_DEMO_MODE = process.env.NEXT_PUBLIC_VA_DEMO_MODE === 'true'

// Deterministic fake account number based on buyer ID
// Same buyer always gets same fake account number
export function getDemoVA(buyerId: string) {
  const seed = buyerId.replace(/-/g, '').slice(0, 8)
  const num = parseInt(seed, 16) % 9000000000 + 1000000000
  return {
    account_number: String(num).slice(0, 10),
    account_name: 'RIVERA PROPERTIES ESCROW',
    bank_name: 'Wema Bank',
    bank_slug: 'wema-bank',
    is_active: true,
    is_demo: true,
  }
}

export type DemoTransaction = {
  id: string
  amount_kobo: number
  narration: string
  paystack_reference: string
  paid_at: string
  created_at: string
}

// Deterministic dummy transactions based on buyer ID
export function getDemoTransactions(buyerId: string): DemoTransaction[] {
  const seed = buyerId.slice(0, 8)
  const base = parseInt(seed, 16)
  const now = new Date()

  return [
    {
      id: `demo-tx-1-${buyerId}`,
      amount_kobo: ((base % 5) + 1) * 500000 * 100,
      narration: 'Initial deposit payment',
      paystack_reference: `DEMO-REF-${seed.toUpperCase()}-001`,
      paid_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `demo-tx-2-${buyerId}`,
      amount_kobo: ((base % 3) + 1) * 250000 * 100,
      narration: 'Monthly installment - Month 1',
      paystack_reference: `DEMO-REF-${seed.toUpperCase()}-002`,
      paid_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}