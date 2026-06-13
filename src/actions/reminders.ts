'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { sendSMS, formatNigerianPhone } from '@/lib/termii'
import { sendEmail } from '@/lib/resend'
import { getCompanyEmailConfig } from '@/lib/email-config'
import { interpolateTemplate } from '@/lib/reminder-utils'
import { logAudit } from '@/lib/audit'
import { incrementUsage } from '@/lib/billing'

type StaffRecord = { company_id: string; role: string }

type Company = {
  id: string
  name: string
  termii_api_key: string | null
  termii_sender_id: string | null
  reminders_enabled: boolean
}

type Buyer = {
  id: string
  full_name: string
  phone: string
  email: string | null
  listing_id: string
}

type Listing = { title: string }

// ── Send a single reminder ────────────────────────────────────────────────

async function dispatchReminder({
  company,
  buyer,
  listing,
  message,
  templateId,
  channel,
  companyId,
}: {
  company: Company
  buyer: Buyer
  listing: Listing
  message: string
  templateId: string | null
  channel: 'sms' | 'email' | 'both'
  companyId: string
}): Promise<{ sms: boolean; email: boolean }> {
  const adminClient = createAdminClient()
  const results = { sms: false, email: false }

  // Send SMS
  if ((channel === 'sms' || channel === 'both') && company.termii_api_key) {
    const phone = formatNigerianPhone(buyer.phone)
    const smsResult = await sendSMS({
      apiKey: company.termii_api_key,
      senderId: company.termii_sender_id ?? 'Rivera',
      to: phone,
      message,
    })

    results.sms = smsResult.success

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('reminder_log')
      .insert({
        company_id: companyId,
        buyer_id: buyer.id,
        template_id: templateId,
        channel: 'sms',
        recipient_phone: phone,
        message,
        status: smsResult.success ? 'sent' : 'failed',
        error: smsResult.error ?? null,
      })

    if (smsResult.success) {
      await incrementUsage(companyId, 'sms_sent', 1)
    }
  }

  // Send email
  if ((channel === 'email' || channel === 'both') && buyer.email) {
    const emailConfig = await getCompanyEmailConfig(companyId)

    const emailResult = await sendEmail({
      to: buyer.email,
      from: emailConfig.displayFrom,
      subject: `Payment reminder — ${listing.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1B4F72; margin-bottom: 8px;">${company.name}</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated reminder from ${company.name} via Rivera.
            To unsubscribe from these reminders, please contact ${company.name} directly.
          </p>
        </div>
      `,
    })

    results.email = emailResult.success

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('reminder_log')
      .insert({
        company_id: companyId,
        buyer_id: buyer.id,
        template_id: templateId,
        channel: 'email',
        recipient_phone: buyer.email,
        message,
        status: emailResult.success ? 'sent' : 'failed',
        error: emailResult.error ?? null,
      })

    if (emailResult.success) {
      await incrementUsage(companyId, 'emails_sent', 1)
    }
  }

  return results
}

// ── Manual reminder ───────────────────────────────────────────────────────

export async function sendManualReminder(
  buyerId: string,
  templateId: string,
  channel: 'sms' | 'email' | 'both'
): Promise<ActionResult> {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('id, name, termii_api_key, termii_sender_id, reminders_enabled')
    .eq('id', staff.company_id)
    .single()

  const company = companyRaw as Company | null
  if (!company) return { success: false, error: 'Company not found' }

  const { data: templateRaw } = await supabase
    .from('reminder_templates')
    .select('id, message_template, trigger_type, channel')
    .eq('id', templateId)
    .eq('company_id', staff.company_id)
    .single()

  const template = templateRaw as {
    id: string
    message_template: string
    trigger_type: string
    channel: 'sms' | 'email' | 'both'
  } | null

  if (!template) return { success: false, error: 'Template not found' }

  const { data: buyerRaw } = await supabase
    .from('buyers')
    .select('id, full_name, phone, email, listing_id')
    .eq('id', buyerId)
    .eq('company_id', staff.company_id)
    .single()

  const buyer = buyerRaw as Buyer | null
  if (!buyer) return { success: false, error: 'Buyer not found' }

  const { data: listingRaw } = await supabase
    .from('listings')
    .select('title')
    .eq('id', buyer.listing_id)
    .single()

  const listing = listingRaw as Listing | null
  if (!listing) return { success: false, error: 'Listing not found' }

  const message = interpolateTemplate(template.message_template, {
    buyer_name: buyer.full_name,
    listing_title: listing.title,
    company_name: company.name,
  })

  // Use channel from template, override with param if explicitly passed
  await dispatchReminder({
    company,
    buyer,
    listing,
    message,
    templateId: template.id,
    channel,
    companyId: staff.company_id,
  })

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'reminder.sent',
    entityType: 'buyer',
    entityId: buyerId,
    entityLabel: `Manual reminder sent to ${buyer.full_name}`,
    metadata: { channel, template_id: templateId },
  })

  revalidatePath(`/sales/${buyerId}`)
  return { success: true, data: undefined }
}

// ── Update reminder template ──────────────────────────────────────────────

export async function updateReminderTemplate(
  templateId: string,
  updates: {
    name?: string
    message_template?: string
    days_offset?: number
    is_active?: boolean
    channel?: 'sms' | 'email' | 'both'
  }
): Promise<ActionResult> {
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

  if (!['admin', 'manager'].includes(staff.role)) {
    return { success: false, error: 'You do not have permission to manage reminders' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('reminder_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('REMINDER TEMPLATE UPDATE FAILED:', error)
    return { success: false, error: 'Failed to update template' }
  }

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

// ── Update reminder settings ──────────────────────────────────────────────

export async function updateReminderSettings(formData: FormData): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can update reminder settings' }
  }

  const termiiApiKey = formData.get('termii_api_key') as string
  const termiiSenderId = formData.get('termii_sender_id') as string
  const remindersEnabled = formData.get('reminders_enabled') === 'true'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('companies')
    .update({
      termii_api_key: termiiApiKey || null,
      termii_sender_id: termiiSenderId || 'Rivera',
      reminders_enabled: remindersEnabled,
    })
    .eq('id', staff.company_id)

  if (error) {
    console.error('REMINDER SETTINGS UPDATE FAILED:', error)
    return { success: false, error: 'Failed to update reminder settings' }
  }

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

// ── Update email domain settings ──────────────────────────────────────────

export async function updateEmailDomainSettings(formData: FormData): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can update email settings' }
  }

  const emailFromName = formData.get('email_from_name') as string
  const customDomain = (formData.get('custom_email_domain') as string)?.trim().toLowerCase() || null

  // If custom domain changed, reset verification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentRaw } = await (adminClient as any)
    .from('companies')
    .select('custom_email_domain')
    .eq('id', staff.company_id)
    .single()

  const current = currentRaw as { custom_email_domain: string | null } | null
  const domainChanged = current?.custom_email_domain !== customDomain

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('companies')
    .update({
      email_from_name: emailFromName || null,
      custom_email_domain: customDomain,
      ...(domainChanged ? { custom_email_domain_verified: false } : {}),
    })
    .eq('id', staff.company_id)

  if (error) {
    console.error('EMAIL DOMAIN UPDATE FAILED:', error)
    return { success: false, error: 'Failed to update email settings' }
  }

  revalidatePath('/settings')
  return { success: true, data: undefined }
}

// ── Automated reminder processor (called by cron) ─────────────────────────

export async function processAutomatedReminders(companyId: string): Promise<void> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('id, name, termii_api_key, termii_sender_id, reminders_enabled')
    .eq('id', companyId)
    .single()

  const company = companyRaw as Company | null
  if (!company || !company.reminders_enabled) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templatesRaw } = await (adminClient as any)
    .from('reminder_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .neq('trigger_type', 'manual')
    .neq('trigger_type', 'payment_completed')

  type Template = {
    id: string
    trigger_type: string
    days_offset: number
    message_template: string
    channel: 'sms' | 'email' | 'both'
  }

  const templates = (templatesRaw ?? []) as Template[]
  if (templates.length === 0) return

  const now = new Date()

  for (const template of templates) {
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - template.days_offset)

    // ── Deposit overdue ──────────────────────────────────────────────────
    if (template.trigger_type === 'deposit_overdue') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: buyersRaw } = await (adminClient as any)
        .from('buyers')
        .select('id, full_name, phone, email, listing_id, created_at')
        .eq('company_id', companyId)
        .eq('status', 'pending_deposit')
        .lte('created_at', cutoffDate.toISOString())

      const buyers = (buyersRaw ?? []) as (Buyer & { created_at: string })[]

      for (const buyer of buyers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingRaw } = await (adminClient as any)
          .from('reminder_log')
          .select('id')
          .eq('company_id', companyId)
          .eq('buyer_id', buyer.id)
          .eq('template_id', template.id)
          .gte('sent_at', new Date(now.toDateString()).toISOString())
          .single()

        if (existingRaw) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: listingRaw } = await (adminClient as any)
          .from('listings')
          .select('title')
          .eq('id', buyer.listing_id)
          .single()

        const listing = listingRaw as Listing | null
        if (!listing) continue

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(buyer.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        const message = interpolateTemplate(template.message_template, {
          buyer_name: buyer.full_name,
          listing_title: listing.title,
          days_overdue: daysOverdue,
          company_name: company.name,
        })

        await dispatchReminder({
          company,
          buyer,
          listing,
          message,
          templateId: template.id,
          channel: template.channel ?? 'sms',
          companyId,
        })
      }
    }

    // ── Installment overdue ──────────────────────────────────────────────
    if (template.trigger_type === 'installment_overdue') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invoicesRaw } = await (adminClient as any)
        .from('buyer_invoices')
        .select('id, buyer_id, total_kobo, amount_paid_kobo, updated_at')
        .eq('company_id', companyId)
        .eq('status', 'partially_paid')
        .lte('updated_at', cutoffDate.toISOString())

      type InvoiceRow = {
        id: string
        buyer_id: string
        total_kobo: number
        amount_paid_kobo: number
        updated_at: string
      }

      const invoices = (invoicesRaw ?? []) as InvoiceRow[]

      for (const invoice of invoices) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: buyerRaw } = await (adminClient as any)
          .from('buyers')
          .select('id, full_name, phone, email, listing_id')
          .eq('id', invoice.buyer_id)
          .single()

        const buyer = buyerRaw as Buyer | null
        if (!buyer) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingRaw } = await (adminClient as any)
          .from('reminder_log')
          .select('id')
          .eq('company_id', companyId)
          .eq('buyer_id', buyer.id)
          .eq('template_id', template.id)
          .gte('sent_at', new Date(now.toDateString()).toISOString())
          .single()

        if (existingRaw) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: listingRaw } = await (adminClient as any)
          .from('listings')
          .select('title')
          .eq('id', buyer.listing_id)
          .single()

        const listing = listingRaw as Listing | null
        if (!listing) continue

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(invoice.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        const outstanding = invoice.total_kobo - invoice.amount_paid_kobo

        const message = interpolateTemplate(template.message_template, {
          buyer_name: buyer.full_name,
          listing_title: listing.title,
          amount: outstanding,
          days_overdue: daysOverdue,
          company_name: company.name,
        })

        await dispatchReminder({
          company,
          buyer,
          listing,
          message,
          templateId: template.id,
          channel: template.channel ?? 'sms',
          companyId,
        })
      }
    }
  }
}