import { encrypt, decrypt } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

const TENANT = 'common'
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`
const SCOPES = 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read offline_access openid email profile'

export interface OutlookMessage {
  id: string
  conversationId: string
  subject: string
  from: { emailAddress: { address: string; name: string } }
  toRecipients: Array<{ emailAddress: { address: string; name: string } }>
  ccRecipients: Array<{ emailAddress: { address: string; name: string } }>
  receivedDateTime: string
  bodyPreview: string
  body: { content: string; contentType: string }
  webLink: string
  isDraft: boolean
}

export interface OutlookThread {
  conversationId: string
  subject: string
  participants: string[]
  lastMessageAt: Date
  lastMessageFromUser: boolean
  providerUrl: string
  messages: OutlookMessage[]
}

export function getOutlookAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/outlook/callback`,
    scope: SCOPES,
    response_mode: 'query',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params.toString()}`
}

export async function exchangeOutlookCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    code,
    redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/outlook/callback`,
    grant_type: 'authorization_code',
    scope: SCOPES,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to exchange Outlook code: ${err}`)
  }

  return res.json()
}

export async function refreshOutlookToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
}> {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to refresh Outlook token: ${err}`)
  }

  return res.json()
}

export async function getOutlookUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to get Outlook user email: ${err}`)
  }

  const data = await res.json()
  return data.mail || data.userPrincipalName || ''
}

export async function getOutlookAccessToken(emailAccountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account || !account.accessTokenEncrypted) {
    throw new Error('Outlook account not found or not connected')
  }

  const now = new Date()
  const isExpired = account.tokenExpiresAt ? account.tokenExpiresAt < now : false

  if (!isExpired) {
    return decrypt(account.accessTokenEncrypted)
  }

  if (!account.refreshTokenEncrypted) {
    throw new Error('No refresh token available for Outlook account')
  }

  const refreshToken = decrypt(account.refreshTokenEncrypted)
  const tokens = await refreshOutlookToken(refreshToken)

  const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000)
  await prisma.emailAccount.update({
    where: { id: emailAccountId },
    data: {
      accessTokenEncrypted: encrypt(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      tokenExpiresAt: expiresAt,
    },
  })

  return tokens.access_token
}

export async function getOutlookThreads(
  accessToken: string,
  userEmail: string,
  daysBack: number
): Promise<OutlookThread[]> {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const sinceIso = since.toISOString()

  const select = 'id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,webLink,isDraft'
  const filter = `receivedDateTime ge ${sinceIso}`
  const baseUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=100`

  const allMessages: OutlookMessage[] = []
  let url: string | null = baseUrl
  let pages = 0

  // Paginate up to ~2000 messages (20 pages × 100). Older threads beyond
  // that are dropped — matches the Gmail path's 500-thread cap roughly.
  while (url && pages < 20) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to fetch Outlook messages: ${err}`)
    }

    const data = await res.json()
    const messages: OutlookMessage[] = data.value || []
    allMessages.push(...messages)
    url = data['@odata.nextLink'] || null
    pages++
  }

  // Group by conversationId
  const threadMap = new Map<string, OutlookMessage[]>()
  for (const msg of allMessages) {
    if (msg.isDraft) continue
    const existing = threadMap.get(msg.conversationId) || []
    existing.push(msg)
    threadMap.set(msg.conversationId, existing)
  }

  const threads: OutlookThread[] = []

  for (const [conversationId, messages] of threadMap) {
    // Sort by receivedDateTime ascending
    messages.sort((a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime())

    const latestMsg = messages[messages.length - 1]
    const subject = latestMsg.subject || '(No Subject)'
    const lastMessageAt = new Date(latestMsg.receivedDateTime)
    const lastSenderEmail = latestMsg.from?.emailAddress?.address?.toLowerCase() || ''
    const lastMessageFromUser = lastSenderEmail === userEmail.toLowerCase()

    const participants = new Set<string>()
    for (const msg of messages) {
      const fromAddr = msg.from?.emailAddress?.address
      const fromName = msg.from?.emailAddress?.name
      if (fromAddr) {
        participants.add(fromName ? `${fromName} <${fromAddr}>` : fromAddr)
      }
      for (const r of msg.toRecipients || []) {
        const addr = r.emailAddress?.address
        const name = r.emailAddress?.name
        if (addr) participants.add(name ? `${name} <${addr}>` : addr)
      }
    }

    threads.push({
      conversationId,
      subject,
      participants: Array.from(participants),
      lastMessageAt,
      lastMessageFromUser,
      providerUrl: latestMsg.webLink,
      messages,
    })
  }

  return threads
}

export async function sendOutlookReply(
  emailAccountId: string,
  conversationId: string,
  toEmail: string,
  subject: string,
  body: string,
  lastProviderMessageId?: string,
): Promise<unknown> {
  const accessToken = await getOutlookAccessToken(emailAccountId)
  const { sanitizeEmailHtml, looksLikeHtml, safeHeaderValue } = await import('./email-safety')
  const isHtml = looksLikeHtml(body)
  const sanitisedBody = isHtml ? sanitizeEmailHtml(body) : body
  const safeTo = safeHeaderValue('To', toEmail)
  const safeSubject = safeHeaderValue('Subject', subject)

  // If we know the message we're replying to, use /reply so Outlook threads
  // the conversation and recipients see it as a true reply. Otherwise fall
  // back to sendMail with a manual In-Reply-To header.
  if (lastProviderMessageId) {
    const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(lastProviderMessageId)}/reply`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          toRecipients: [{ emailAddress: { address: safeTo } }],
          body: { contentType: isHtml ? 'HTML' : 'Text', content: sanitisedBody },
        },
        comment: '',
      }),
    })
    if (!res.ok && res.status !== 202) {
      const err = await res.text()
      throw new Error(`Outlook reply failed: ${err}`)
    }
    return { accepted: true, threaded: true }
  }

  // Fallback for missing message id — at least keep the conversation id
  const payload = {
    message: {
      subject: safeSubject,
      body: { contentType: isHtml ? 'HTML' : 'Text', content: sanitisedBody },
      toRecipients: [{ emailAddress: { address: safeTo } }],
      ...(conversationId ? { conversationId } : {}),
    },
    saveToSentItems: true,
  }
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Outlook send failed: ${err}`)
  }
  return { accepted: true, threaded: false }
}

const NOISE_CATEGORIES = ['Junk Email', 'Newsletters']
const NOISE_SENDER_PATTERNS = ['noreply', 'no-reply', 'donotreply', 'newsletter', 'marketing']

export function isNoisyOutlookMessage(senderEmail: string, categories: string[] = []): boolean {
  if (categories.some(c => NOISE_CATEGORIES.includes(c))) return true
  const lowerSender = senderEmail.toLowerCase()
  return NOISE_SENDER_PATTERNS.some(p => lowerSender.includes(p))
}

export async function getUpcomingOutlookEvents(emailAccountId: string, hoursAhead = 48) {
  const token = await getOutlookAccessToken(emailAccountId)
  const start = new Date().toISOString()
  const end = new Date(Date.now() + hoursAhead * 3600_000).toISOString()
  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=subject,start,attendees&$orderby=start/dateTime`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.value ?? []) as Array<{ id: string; subject?: string; start: { dateTime: string }; attendees?: Array<{ emailAddress: { address: string; name?: string } }> }>
}
