type TermiiSendParams = {
    apiKey: string
    senderId: string
    to: string
    message: string
  }
  
  export async function sendSMS(params: TermiiSendParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: params.to,
          from: params.senderId,
          sms: params.message,
          type: 'plain',
          api_key: params.apiKey,
          channel: 'generic',
        }),
      })
  
      const data = await response.json() as { message?: string; code?: string }
  
      if (!response.ok || data.code === 'error') {
        console.error('TERMII ERROR:', data)
        return { success: false, error: data.message ?? 'SMS send failed' }
      }
  
      return { success: true }
    } catch (err) {
      console.error('TERMII FAILED:', err)
      return { success: false, error: 'Failed to send SMS' }
    }
  }
  
  export function formatNigerianPhone(phone: string): string {
    // Strip spaces and dashes
    const cleaned = phone.replace(/[\s\-]/g, '')
  
    // Convert 0XXXXXXXXXX to 234XXXXXXXXXX
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `234${cleaned.slice(1)}`
    }
  
    // Already in international format
    if (cleaned.startsWith('234')) return cleaned
    if (cleaned.startsWith('+234')) return cleaned.slice(1)
  
    return cleaned
  }