import { google } from 'googleapis'
import { decrypt, encrypt } from './utils'
import { prisma } from './prisma'

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_BASE_URL}/api/integrations/gmail/callback`
  )
}

export function getGmailAuthUrl(): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    prompt: 'consent',
  })
}

export async function getGmailClient(emailAccountId: string) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
  })
  if (!account || !account.accessTokenEncrypted) {
    throw new Error('Gmail account not found or not connected')
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: decrypt(account.accessTokenEncrypted),
    refresh_token: account.refreshTokenEncrypted ? decrypt(account.refreshTokenEncrypted) : undefined,
  })

  oauth2Client.on('tokens', async (tokens) => {
    const updateData: Record<string, string | Date> = {}
    if (tokens.access_token) {
      updateData.accessTokenEncrypted = encrypt(tokens.access_token)
    }
    if (tokens.refresh_token) {
      updateData.refreshTokenEncrypted = encrypt(tokens.refresh_token)
    }
    if (tokens.expiry_date) {
      updateData.tokenExpiresAt = new Date(tokens.expiry_date)
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: updateData,
      })
    }
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export async function getGmailAccessToken(emailAccountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account || !account.accessTokenEncrypted) {
    throw new Error('Gmail account not found or not connected')
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: decrypt(account.accessTokenEncrypted),
    refresh_token: account.refreshTokenEncrypted ? decrypt(account.refreshTokenEncrypted) : undefined,
  })

  const { token } = await oauth2Client.getAccessToken()
  if (!token) throw new Error('Failed to obtain Gmail access token')

  // Persist refreshed credentials if oauth2 client rotated them
  const creds = oauth2Client.credentials
  const updateData: Record<string, string | Date> = {}
  if (creds.access_token) updateData.accessTokenEncrypted = encrypt(creds.access_token)
  if (creds.refresh_token) updateData.refreshTokenEncrypted = encrypt(creds.refresh_token)
  if (creds.expiry_date) updateData.tokenExpiresAt = new Date(creds.expiry_date)
  if (Object.keys(updateData).length > 0) {
    await prisma.emailAccount.update({ where: { id: emailAccountId }, data: updateData })
  }

  return token
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendGmailReply(
  emailAccountId: string,
  threadId: string,
  toEmail: string,
  subject: string,
  body: string,
): Promise<unknown> {
  const accessToken = await getGmailAccessToken(emailAccountId)
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account) throw new Error('Gmail account not found')

  // Find the most recent message in the thread for In-Reply-To / References
  const thread = await prisma.emailThread.findFirst({
    where: { emailAccountId, providerThreadId: threadId },
    include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 } },
  })
  const lastProviderMessageId = thread?.messages[0]?.providerMessageId

  // Gmail providerMessageId is the internal id, but In-Reply-To wants the RFC Message-ID header.
  // We try to fetch it via the Gmail API to get the actual Message-ID header.
  let rfcMessageId: string | null = null
  if (lastProviderMessageId) {
    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(lastProviderMessageId)}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (res.ok) {
        const data = await res.json() as { payload?: { headers?: Array<{ name: string; value: string }> } }
        const headers = data.payload?.headers || []
        const msgIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id')
        if (msgIdHeader) rfcMessageId = msgIdHeader.value
      }
    } catch {
      // ignore — best effort
    }
  }

  const headerLines = [
    `From: ${account.emailAddress}`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
  ]
  if (rfcMessageId) {
    headerLines.push(`In-Reply-To: ${rfcMessageId}`)
    headerLines.push(`References: ${rfcMessageId}`)
  }
  const rfc2822 = headerLines.join('\r\n') + '\r\n\r\n' + body
  const raw = base64UrlEncode(rfc2822)

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw, threadId }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail send failed: ${err}`)
  }
  return res.json()
}

export function getGmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`
}

const NOISE_LABELS = ['SPAM', 'TRASH', 'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS', 'CATEGORY_UPDATES']
const NOISE_SENDERS = ['no-reply', 'noreply', 'donotreply', 'notifications', 'alerts', 'marketing', 'newsletter']

export function isNoisyThread(labels: string[], senderEmail: string): boolean {
  if (labels.some(l => NOISE_LABELS.includes(l))) return true
  const localPart = senderEmail.split('@')[0]?.toLowerCase() || ''
  return NOISE_SENDERS.some(n => localPart.includes(n))
}

export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000)
}

export function decodeBase64(str: string): string {
  try {
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

export function getMessageBody(payload: {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null }> | null
}): string {
  if (payload.body?.data) {
    const text = decodeBase64(payload.body.data)
    if (payload.mimeType === 'text/html') return extractTextFromHtml(text)
    return text
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data).substring(0, 2000)
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return extractTextFromHtml(decodeBase64(part.body.data))
      }
    }
  }
  return ''
}
