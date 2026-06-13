'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function updatePartnerProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const bankName = formData.get('bank_name') as string
  const bankAccountNumber = formData.get('bank_account_number') as string
  const bankAccountName = formData.get('bank_account_name') as string

  if (!fullName || !phone) {
    return { success: false, error: 'Name and phone are required' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('partners')
    .update({
      full_name: fullName,
      phone,
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_name: bankAccountName || null,
    })
    .eq('user_id', user.id)

  if (error) {
    console.error('PARTNER PROFILE UPDATE FAILED:', error.message)
    return { success: false, error: 'Failed to update profile' }
  }

  revalidatePath('/partner/profile')
  return { success: true, data: undefined }
}