import { ImapFlow } from 'imapflow'
import { decrypt, encrypt } from './utils'
import { prisma } from './prisma'
import { isSafePublicHostname } from './net-safety'
import { isNoisyEmail } from './noise-filter'

export interface ImapThread {
  threadId: string        // generated: hash of subject+participants
  subject: string
  participants: string[]
  lastMessageAt: string
  lastMessageFromUser: boolean
  messages: ImapMessage[]
}

export interface ImapMessage {
  uid: number
  subject: string
  from: string
  fromName: string
  to: string[]
  date: string
  textBody: string
  isFromUser: boolean
  messageId?: string
  inReplyTo?: string
  references?: string[]
  // imapflow's MessageStructureObject — passed through to email-extract
  bodyStructure?: unknown
}

export async function getImapAccessDetails(emailAccountId: string): Promise<{
  host: string
  port: number
  email: string
  password: string
}> {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account || !account.imapHost || !account.passwordEncrypted) {
    throw new Error('IMAP account not configured')
  }
  // Re-validate the stored host on every use. The connect route already
  // checks this, but defending in depth here means a bad/legacy/seeded row
  // can't slip through and SSRF a private host.
  if (!isSafePublicHostname(account.imapHost)) {
    throw new Error('IMAP host is not safe to connect to')
  }
  return {
    host: account.imapHost,
    port: account.imapPort ?? 993,
    email: account.emailAddress,
    password: decrypt(account.passwordEncrypted),
  }
}

export async function testImapConnection(host: string, port: number, email: string, password: string): Promise<boolean> {
  const client = new ImapFlow({
    host, port,
    secure: port === 993,
    auth: { user: email, pass: password },
    logger: false,
  })
  try {
    await client.connect()
    await client.logout()
    return true
  } catch {
    return false
  }
}

export async function getImapThreads(emailAccountId: string, daysBack: number = 30): Promise<ImapThread[]> {
  const { host, port, email, password } = await getImapAccessDetails(emailAccountId)

  const client = new ImapFlow({
    host, port,
    secure: port === 993,
    auth: { user: email, pass: password },
    logger: false,
  })

  await client.connect()

  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const messages: ImapMessage[] = []

  const lock = await client.getMailboxLock('INBOX')
  try {
    for await (const msg of client.fetch(
      { since },
      { envelope: true, bodyStructure: true, bodyParts: ['text'], headers: ['references'] }
    )) {
      const from = msg.envelope?.from?.[0]
      const fromEmail = from?.address || ''
      const fromName = from?.name || fromEmail
      const to = (msg.envelope?.to || []).map(r => r.address || '')
      const subject = msg.envelope?.subject || '(no subject)'
      const date = msg.envelope?.date?.toISOString() || new Date().toISOString()

      // Get text body
      let textBody = ''
      const textPart = msg.bodyParts?.get('text')
      if (textPart) {
        textBody = textPart.toString().substring(0, 1000)
      }

      // Pull threading headers — Message-ID, In-Reply-To, References
      const messageId = (msg.envelope?.messageId || '').trim() || undefined
      const inReplyTo = (msg.envelope?.inReplyTo || '').trim() || undefined
      let references: string[] | undefined
      const headerBuf = msg.headers
      if (headerBuf) {
        // headers buffer contains "References: <id1> <id2>\r\n..."
        const headerStr = headerBuf.toString()
        const match = headerStr.match(/^references:\s*([\s\S]*?)(?:\r?\n[a-z-]+:|$)/im)
        if (match) {
          references = match[1].match(/<[^>]+>/g) || undefined
        }
      }

      messages.push({
        uid: msg.uid,
        subject,
        from: fromEmail,
        fromName,
        to,
        date,
        textBody,
        isFromUser: fromEmail.toLowerCase() === email.toLowerCase(),
        messageId,
        inReplyTo,
        references,
        bodyStructure: msg.bodyStructure,
      })
    }
  } finally {
    lock.release()
  }

  await client.logout()

  // Threading: prefer Message-ID / In-Reply-To / References, fall back to
  // normalised-subject + participants only when no headers exist.
  // Process oldest first so parents land before replies.
  messages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const messageIdToThreadKey = new Map<string, string>()
  const subjectKeyToThreadKey = new Map<string, string>()
  const threadKeyToMessages = new Map<string, ImapMessage[]>()
  let threadCounter = 0

  const subjectKeyFor = (msg: ImapMessage): string => {
    const norm = msg.subject.replace(/^(re:|fwd?:|fw:)\s*/i, '').trim().toLowerCase()
    const parties = [msg.from, ...msg.to].map(s => s.toLowerCase()).sort().join(',')
    return `${norm}|${parties}`
  }

  for (const msg of messages) {
    // 1. Inherit thread from explicit headers
    let threadKey: string | undefined
    if (msg.inReplyTo && messageIdToThreadKey.has(msg.inReplyTo)) {
      threadKey = messageIdToThreadKey.get(msg.inReplyTo)
    }
    if (!threadKey && msg.references) {
      for (const ref of msg.references) {
        if (messageIdToThreadKey.has(ref)) {
          threadKey = messageIdToThreadKey.get(ref)
          break
        }
      }
    }
    // 2. Fallback to subject+participants only if no headers matched
    if (!threadKey) {
      const sKey = subjectKeyFor(msg)
      if (subjectKeyToThreadKey.has(sKey)) {
        threadKey = subjectKeyToThreadKey.get(sKey)
      } else {
        threadKey = `t${threadCounter++}`
        subjectKeyToThreadKey.set(sKey, threadKey)
      }
    }
    if (!threadKey) {
      threadKey = `t${threadCounter++}`
    }
    if (msg.messageId) messageIdToThreadKey.set(msg.messageId, threadKey)
    if (!threadKeyToMessages.has(threadKey)) threadKeyToMessages.set(threadKey, [])
    threadKeyToMessages.get(threadKey)!.push(msg)
  }

  const threads: ImapThread[] = []
  for (const [, msgs] of threadKeyToMessages) {
    msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const latest = msgs[0]
    const participants = [...new Set(msgs.flatMap(m => [m.from, ...m.to]))]
    // Stable threadId derived from the root message-id when available,
    // otherwise from subject+participants so re-scans converge to the same id.
    const oldest = msgs[msgs.length - 1]
    const seed = oldest.messageId || `${latest.subject}|${participants.sort().join(',')}`
    const threadId = Buffer.from(seed).toString('base64').substring(0, 40)

    threads.push({
      threadId,
      subject: latest.subject,
      participants,
      lastMessageAt: latest.date,
      lastMessageFromUser: latest.isFromUser,
      messages: msgs,
    })
  }

  return threads
}

export function isNoisyImapSender(fromEmail: string, subject: string, noiseLevel?: number): boolean {
  return isNoisyEmail(fromEmail, subject, noiseLevel)
}

// Re-export encrypt so imap connect route can use it
export { encrypt }
