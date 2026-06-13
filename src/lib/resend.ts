import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'reminders@getrivera.co'
const DEFAULT_FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Rivera'

type SendEmailParams = {
  to: string
  subject: string
  html: string
  from?: string // override e.g. "Fine Properties <fineproperties@mail.getrivera.co>"
  replyTo?: string
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; error?: string }> {
  const from = params.from ?? `${DEFAULT_FROM_NAME} <${DEFAULT_FROM}>`

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    })

    if (error) {
      console.error('RESEND ERROR:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('RESEND FAILED:', err)
    return { success: false, error: 'Failed to send email' }
  }
}