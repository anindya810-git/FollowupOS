import { google } from 'googleapis'
import { decrypt, encrypt } from './utils'
import { prisma } from './prisma'
import { isNoisyEmail, isNoisyGmailLabels } from './noise-filter'

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_BASE_URL}/api/integrations/gmail/callback`
  )
}

export function getGmailAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/tasks',
    ],
    prompt: 'consent',
    ...(state ? { state } : {}),
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
    expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined,
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
    expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined,
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

  // body may be HTML — detect, sanitise, and build both parts
  const { sanitizeEmailHtml, htmlToPlainText, looksLikeHtml, safeHeaderValue } = await import('./email-safety')
  const isHtml = looksLikeHtml(body)
  const htmlBody = isHtml ? sanitizeEmailHtml(body) : body.replace(/\n/g, '<br>')
  const textFallback = isHtml ? htmlToPlainText(body) : body

  const safeFrom = safeHeaderValue('From', account.emailAddress)
  const safeTo = safeHeaderValue('To', toEmail)
  const safeSubject = safeHeaderValue('Subject', subject)
  const safeInReplyTo = rfcMessageId ? safeHeaderValue('In-Reply-To', rfcMessageId) : null

  const boundary = `==pendingly_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const headerLines = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  if (safeInReplyTo) {
    headerLines.push(`In-Reply-To: ${safeInReplyTo}`)
    headerLines.push(`References: ${safeInReplyTo}`)
  }
  const mimeBody = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    textFallback,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n')
  const rfc2822 = headerLines.join('\r\n') + '\r\n\r\n' + mimeBody
  const raw = base64UrlEncode(rfc2822)

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    // Only attach threadId for true replies — an empty thread_id is rejected by
    // Gmail, so a brand-new email (e.g. a meeting follow-up) omits it.
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail send failed: ${err}`)
  }
  return res.json()
}

export async function getUpcomingGoogleEvents(emailAccountId: string, hoursAhead = 48) {
  const token = await getGmailAccessToken(emailAccountId)
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + hoursAhead * 3600_000).toISOString()
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.items ?? []) as Array<{ id: string; summary?: string; start: { dateTime?: string; date?: string }; attendees?: Array<{ email: string; displayName?: string }> }>
}

export interface EndedCalendarEvent {
  id: string
  title: string
  endIso: string | null
  attendees: Array<{ email: string; name?: string }>
}

// Events that ENDED within the last `hoursBack` hours — used to draft
// post-meeting follow-ups.
export async function getRecentlyEndedGoogleEvents(emailAccountId: string, hoursBack = 6): Promise<EndedCalendarEvent[]> {
  const token = await getGmailAccessToken(emailAccountId)
  const timeMin = new Date(Date.now() - hoursBack * 3600_000).toISOString()
  const timeMax = new Date().toISOString()
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  const data = await res.json()
  const items = (data.items ?? []) as Array<{ id: string; summary?: string; end?: { dateTime?: string }; attendees?: Array<{ email: string; displayName?: string; self?: boolean; responseStatus?: string }> }>
  const now = Date.now()
  return items
    .filter(e => e.end?.dateTime && new Date(e.end.dateTime).getTime() <= now)
    .map(e => ({
      id: e.id,
      title: e.summary || 'Meeting',
      endIso: e.end?.dateTime ?? null,
      attendees: (e.attendees ?? []).filter(a => !a.self).map(a => ({ email: a.email, name: a.displayName })),
    }))
}

export function getGmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`
}

// ─── Google Calendar: create event ───────────────────────────────────────────

export interface CreateGoogleEventInput {
  summary: string
  description?: string
  startIso: string   // ISO 8601 with timezone, e.g. 2026-05-20T14:00:00+05:30
  endIso: string
  attendees?: string[]
  reminderMinutes?: number
  withMeetLink?: boolean
}

export async function createGoogleCalendarEvent(
  emailAccountId: string,
  input: CreateGoogleEventInput,
): Promise<{ eventId: string; htmlLink?: string; meetLink?: string }> {
  const token = await getGmailAccessToken(emailAccountId)
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso },
    end: { dateTime: input.endIso },
  }
  if (input.attendees && input.attendees.length) {
    body.attendees = input.attendees.map(email => ({ email }))
  }
  if (typeof input.reminderMinutes === 'number') {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: input.reminderMinutes }],
    }
  }
  if (input.withMeetLink) {
    body.conferenceData = {
      createRequest: {
        requestId: `pendingly-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=${input.withMeetLink ? 1 : 0}&sendUpdates=all`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Google Calendar event create failed: ${await res.text()}`)
  const data = await res.json()
  const meetLink: string | undefined = data.conferenceData?.entryPoints?.find(
    (e: { entryPointType?: string; uri?: string }) => e.entryPointType === 'video',
  )?.uri
  return { eventId: data.id, htmlLink: data.htmlLink, meetLink }
}

export async function deleteGoogleCalendarEvent(emailAccountId: string, eventId: string): Promise<void> {
  const token = await getGmailAccessToken(emailAccountId)
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ─── Google Tasks: create task ───────────────────────────────────────────────

export interface CreateGoogleTaskInput {
  title: string
  notes?: string
  dueIso?: string  // RFC 3339 timestamp; Tasks API only honors the date portion
}

export async function createGoogleTask(
  emailAccountId: string,
  input: CreateGoogleTaskInput,
): Promise<{ taskId: string }> {
  const token = await getGmailAccessToken(emailAccountId)
  const body: Record<string, unknown> = { title: input.title }
  if (input.notes) body.notes = input.notes
  if (input.dueIso) body.due = input.dueIso
  // Use the default ("@default") task list; this exists for every account.
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Google Tasks create failed: ${await res.text()}`)
  const data = await res.json()
  return { taskId: data.id }
}

export async function deleteGoogleTask(emailAccountId: string, taskId: string): Promise<void> {
  const token = await getGmailAccessToken(emailAccountId)
  await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function isNoisyThread(labels: string[], senderEmail: string, subject = '', noiseLevel?: number): boolean {
  if (isNoisyGmailLabels(labels, noiseLevel)) return true
  return isNoisyEmail(senderEmail, subject, noiseLevel)
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

type MailPart = {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: MailPart[] | null
}

export function getMessageBody(payload: MailPart): string {
  // Walk the MIME tree depth-first, preferring text/plain over text/html.
  function collect(part: MailPart): { plain: string; html: string } {
    let plain = ''
    let html = ''

    if (part.body?.data) {
      const decoded = decodeBase64(part.body.data)
      if (part.mimeType === 'text/plain') plain = decoded
      else if (part.mimeType === 'text/html') html = extractTextFromHtml(decoded)
    }

    for (const child of part.parts ?? []) {
      const sub = collect(child)
      if (!plain && sub.plain) plain = sub.plain
      if (!html && sub.html) html = sub.html
    }

    return { plain, html }
  }

  const { plain, html } = collect(payload)
  const body = plain || html
  return body.substring(0, 4000)
}
