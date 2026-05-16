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
