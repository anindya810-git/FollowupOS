import { ImapFlow } from 'imapflow'
import { decrypt, encrypt } from './utils'
import { prisma } from './prisma'

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
      { envelope: true, bodyParts: ['text'] }
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

      messages.push({
        uid: msg.uid,
        subject,
        from: fromEmail,
        fromName,
        to,
        date,
        textBody,
        isFromUser: fromEmail.toLowerCase() === email.toLowerCase(),
      })
    }
  } finally {
    lock.release()
  }

  await client.logout()

  // Group by normalized subject to form threads
  const threadMap = new Map<string, ImapMessage[]>()
  for (const msg of messages) {
    const normalizedSubject = msg.subject.replace(/^(re:|fwd?:|fw:)\s*/i, '').trim().toLowerCase()
    if (!threadMap.has(normalizedSubject)) threadMap.set(normalizedSubject, [])
    threadMap.get(normalizedSubject)!.push(msg)
  }

  const threads: ImapThread[] = []
  for (const [normSubject, msgs] of threadMap) {
    msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const latest = msgs[0]
    const participants = [...new Set(msgs.flatMap(m => [m.from, ...m.to]))]
    const threadId = Buffer.from(normSubject + participants.sort().join(',')).toString('base64').substring(0, 40)

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

export function isNoisyImapSender(fromEmail: string, subject: string): boolean {
  const noisePatterns = ['noreply', 'no-reply', 'donotreply', 'notifications@', 'newsletter', 'marketing', 'alerts@', 'support@', 'info@']
  const noiseSubjects = ['unsubscribe', 'newsletter', 'invoice #', 'receipt', 'order confirmation', 'shipping', 'tracking']
  const emailLower = fromEmail.toLowerCase()
  const subjectLower = subject.toLowerCase()
  return noisePatterns.some(p => emailLower.includes(p)) || noiseSubjects.some(p => subjectLower.includes(p))
}

// Re-export encrypt so imap connect route can use it
export { encrypt }
