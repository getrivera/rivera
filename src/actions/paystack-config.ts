'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

type StaffRecord = { company_id: string; role: string }

type PaystackConfigData = {
  id: string
  company_id: string
  paystack_secret_key: string
  paystack_public_key: string | null
  business_name: string | null
  is_active: boolean
  connected_at: string
}

export async function getPaystackConfig(): Promise<PaystackConfigData | null> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return null
  const staff = staffData as StaffRecord

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any)
    .from('company_paystack_config')
    .select('id, company_id, paystack_secret_key, paystack_public_key, business_name, is_active, connected_at')
    .eq('company_id', staff.company_id)
    .single()

  return data as PaystackConfigData | null
}

export async function savePaystackConfig(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  if (staff.role !== 'admin') {
    return { success: false, error: 'Only admins can manage payment settings' }
  }

  const secretKey = (formData.get('paystack_secret_key') as string)?.trim()
  const publicKey = (formData.get('paystack_public_key') as string)?.trim()
  const businessName = (formData.get('business_name') as string)?.trim()

  if (!secretKey) {
    return { success: false, error: 'Paystack secret key is required' }
  }

  if (!secretKey.startsWith('sk_')) {
    return { success: false, error: 'Invalid Paystack secret key format. It should start with sk_' }
  }

  // Verify the key works by calling Paystack
  try {
    const verifyRes = await fetch('https://api.paystack.co/balance', {
      headers: { Authorization: `Bearer ${secretKey}` },
    })

    if (!verifyRes.ok) {
      return { success: false, error: 'Invalid Paystack secret key. Please check and try again.' }
    }
  } catch {
    return { success: false, error: 'Could not verify Paystack key. Please try again.' }
  }

  // Upsert config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('company_paystack_config')
    .upsert(
      {
        company_id: staff.company_id,
        paystack_secret_key: secretKey,
        paystack_public_key: publicKey || null,
        business_name: businessName || null,
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' }
    )

  if (error) {
    console.error('PAYSTACK CONFIG SAVE FAILED:', error.message)
    return { success: false, error: 'Failed to save Paystack configuration.' }
  }

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

export async function disconnectPaystackConfig(): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  if (staff.role !== 'admin') {
    return { success: false, error: 'Only admins can manage payment settings' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('company_paystack_config')
    .update({ is_active: false })
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('PAYSTACK CONFIG DISCONNECT FAILED:', error.message)
    return { success: false, error: 'Failed to disconnect Paystack.' }
  }

  revalidatePath('/settings')
  return { success: true, data: undefined }
}