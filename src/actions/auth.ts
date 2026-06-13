'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify, generateCompanyCode } from '@/lib/utils'
import { sendEmail } from '@/lib/resend'
import type { ActionResult } from '@/types'

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error('Invalid email or password')
  }

  // Check company status
  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffData } = await (adminClient as any)
    .from('company_staff')
    .select('company_id')
    .eq('user_id', data.user.id)
    .single()

  if (staffData?.company_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: company } = await (adminClient as any)
      .from('companies')
      .select('status')
      .eq('id', staffData.company_id)
      .single()

    if (company?.status === 'pending') {
      redirect('/pending')
    }

    if (company?.status === 'suspended') {
      await supabase.auth.signOut()
      throw new Error('Your account has been suspended. Please contact support.')
    }
  }

  redirect('/dashboard')
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ── Company signup ─────────────────────────────────────────────────────────

export async function signupCompany(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const companyName = formData.get('company_name') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password || !companyName || !fullName) {
    return { success: false, error: 'All fields are required' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const adminClient = createAdminClient()

  // Check if email is already registered before hitting auth,
  // avoids burning a Supabase rate-limit attempt on duplicate signups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUsers } = await (adminClient as any).auth.admin.listUsers()
  const emailTaken = existingUsers?.users?.some(
    (u: { email: string }) => u.email?.toLowerCase() === email.toLowerCase()
  )
  if (emailTaken) {
    return { success: false, error: 'An account with this email already exists' }
  }

  const supabase = await createClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('rate limit') ||
        authError?.message?.toLowerCase().includes('after')) {
      return { success: false, error: 'Too many attempts. Please wait a moment and try again.' }
    }
    if (authError?.message?.toLowerCase().includes('already registered')) {
      return { success: false, error: 'An account with this email already exists' }
    }
    return { success: false, error: authError?.message ?? 'Failed to create account' }
  }

  const userId = authData.user.id
  const slug = slugify(companyName)
  const companyCode = generateCompanyCode(companyName)

  // 2. Check slug is not taken
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (adminClient as any)
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()

  const finalSlug = existing
    ? `${slug}-${Math.random().toString(36).substring(2, 6)}`
    : slug

    const result = await createCompanyAndStaff(
      adminClient, userId, companyName, fullName, email, finalSlug, companyCode
    )
  
    // If company setup failed, delete the auth user so they can try again cleanly
    if (!result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any).auth.admin.deleteUser(userId)
    }
  
    return result

}

async function createCompanyAndStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  userId: string,
  companyName: string,
  fullName: string,
  email: string,
  slug: string,
  companyCode: string
): Promise<ActionResult> {
  // 1. Create company — status: pending
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .insert({
      name: companyName,
      slug,
      company_code: companyCode,
      subscription_plan: 'starter',
      subscription_status: 'trialing',
      status: 'pending',
    })
    .select('id')
    .single()

  if (companyError || !company) {
    return { success: false, error: 'Failed to create company. Please try again.' }
  }

  // 2. Create company_staff record
  const { error: staffError } = await adminClient.from('company_staff').insert({
    company_id: company.id,
    user_id: userId,
    role: 'admin',
    status: 'active',
  })

  if (staffError) {
    return { success: false, error: 'Failed to set up account. Please contact support.' }
  }

  // 3. Update profile with company_id
  await adminClient
    .from('profiles')
    .update({ company_id: company.id })
    .eq('id', userId)

  // 4. Notify Rivera admin
  const adminEmail = process.env.RIVERA_ADMIN_EMAIL ?? 'fadlullahazeez@gmail.com'
  await sendEmail({
    to: adminEmail,
    subject: `New company signup — ${companyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111827;">New company signup on Rivera</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 140px;">Company</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Admin name</td>
            <td style="padding: 8px 0; font-size: 14px;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; font-size: 14px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Company ID</td>
            <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${company.id}</td>
          </tr>
        </table>
        <div style="margin-top: 24px; padding: 16px; background: #F3F4F6; border-radius: 8px;">
          <p style="font-size: 14px; color: #374151; margin: 0;">
            To activate this company, run the following in Supabase:
          </p>
          <pre style="margin-top: 8px; font-size: 13px; color: #111827;">UPDATE companies SET status = 'active' WHERE id = '${company.id}';</pre>
        </div>
      </div>
    `,
  })

  return { success: true, data: { slug } }
}

// ── Forgot password ────────────────────────────────────────────────────────

export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string

  if (!email) {
    return { success: false, error: 'Email is required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
  })

  if (error) {
    return { success: false, error: 'Failed to send reset email. Please try again.' }
  }

  return { success: true, data: undefined }
}

// ── Reset password ─────────────────────────────────────────────────────────

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm_password') as string

  if (!password || !confirm) {
    return { success: false, error: 'Both fields are required' }
  }

  if (password !== confirm) {
    return { success: false, error: 'Passwords do not match' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: 'Failed to update password. Please request a new reset link.' }
  }

  return { success: true, data: undefined }
}