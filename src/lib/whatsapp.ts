interface DigestPayload {
  userName?: string
  totalOpen: number
  overdueCount: number
  topItems: Array<{ title: string; reason: string; category: string; ownerName?: string | null }>
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

export async function sendWhatsAppDigest(toPhone: string, payload: DigestPayload) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('WhatsApp not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM')
  }

  const to = `whatsapp:${normalizePhone(toPhone)}`
  const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`

  const greeting = payload.userName ? `Hi ${payload.userName}` : 'Hi'
  let body = `📬 *${greeting}, here's your Pendingly digest:*\n\n`
  body += `📋 Open follow-ups: *${payload.totalOpen}*\n`
  if (payload.overdueCount > 0) body += `⚠️ Overdue: *${payload.overdueCount}*\n`

  if (payload.topItems.length > 0) {
    body += `\n*Top priorities today:*\n`
    payload.topItems.slice(0, 5).forEach((item, i) => {
      body += `${i + 1}. ${item.title}\n`
    })
  }

  body += `\nhttps://pendingly.app/dashboard`

  const params = new URLSearchParams()
  params.append('From', from)
  params.append('To', to)
  params.append('Body', body)

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: params.toString(),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(`Twilio WhatsApp failed: ${err.message ?? res.status}`)
  }
}
