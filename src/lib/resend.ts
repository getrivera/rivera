import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'reminders@getrivera.co'
const DEFAULT_FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Rivera'

type SendEmailParams = {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; error?: string }> {
  const from = params.from ?? `${DEFAULT_FROM_NAME} <${DEFAULT_FROM}>`

  try {
    const { error } = await getResend().emails.send({
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