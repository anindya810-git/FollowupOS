import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') || 'open'
  const category = searchParams.get('category')
  const priority = searchParams.get('priority')
  const search = searchParams.get('search')
  const repeatedAsks = searchParams.get('repeated_asks')
  // Date-of-email range → filters on the source email's last message date
  const emailFrom = searchParams.get('email_from')
  const emailTo = searchParams.get('email_to')
  // Date-of-action range → filters on the action item's due date
  const actionFrom = searchParams.get('action_from')
  const actionTo = searchParams.get('action_to')
  // Inbox filter → filters on the related email thread's emailAccountId
  const inboxId = searchParams.get('inbox_id')
  // Sender filter → partial match on sender name or email
  const senderEmail = searchParams.get('sender_email')
  // Domain filter → suffix match on sender email domain
  const senderDomain = searchParams.get('sender_domain')
  // Keyword search → checks thread subject
  const keywords = searchParams.get('keywords')
  // Attachment filter → thread has at least one message with attachments
  const hasAttachment = searchParams.get('has_attachment') === '1'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Record<string, unknown> = {
    userId: session.user.id,
  }

  // status='all' means no status constraint (every state)
  if (status && status !== 'all') where.status = status

  if (category) where.category = category
  if (priority) where.priority = priority
  if (repeatedAsks) where.repeatedAskCount = { gte: 2 }

  // Action due-date range. dueDate is stored as an ISO string, so lexical
  // comparison works; pad the upper bound to the end of the day.
  if (actionFrom || actionTo) {
    const dueDate: Record<string, string> = {}
    if (actionFrom) dueDate.gte = actionFrom
    if (actionTo) dueDate.lte = `${actionTo}T23:59:59.999`
    where.dueDate = dueDate
  }

  // Thread-level filters (inbox, dates, sender, domain, keywords, attachments).
  if (emailFrom || emailTo || inboxId || senderEmail || senderDomain || keywords || hasAttachment) {
    const threadFilter: Record<string, unknown> = {}
    if (inboxId) threadFilter.emailAccountId = inboxId
    if (emailFrom || emailTo) {
      const lastMessageAt: Record<string, Date> = {}
      if (emailFrom) lastMessageAt.gte = new Date(emailFrom)
      if (emailTo) lastMessageAt.lte = new Date(`${emailTo}T23:59:59.999`)
      threadFilter.lastMessageAt = lastMessageAt
    }
    if (keywords) threadFilter.subject = { contains: keywords, mode: 'insensitive' }
    if (senderEmail || senderDomain || hasAttachment) {
      const msgFilter: Record<string, unknown> = { isFromUser: false }
      if (senderEmail) {
        msgFilter.OR = [
          { senderEmail: { contains: senderEmail, mode: 'insensitive' } },
          { senderName: { contains: senderEmail, mode: 'insensitive' } },
        ]
      }
      if (senderDomain) {
        msgFilter.senderEmail = { endsWith: `@${senderDomain.replace(/^@/, '')}`, mode: 'insensitive' }
      }
      if (hasAttachment) msgFilter.attachmentsJson = { not: null }
      threadFilter.messages = { some: msgFilter }
    }
    where.emailThread = { is: threadFilter }
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { reason: { contains: search } },
      { ownerName: { contains: search } },
      { ownerEmail: { contains: search } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { lastActivityAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        emailThread: {
          select: {
            subject: true,
            providerUrl: true,
            lastMessageAt: true,
            participants: true,
            emailAccount: {
              select: { provider: true, emailAddress: true },
            },
            // Latest non-user message so the card can render link/attachment
            // chip counts without pulling the full thread.
            messages: {
              where: { isFromUser: false },
              orderBy: { sentAt: 'desc' },
              take: 1,
              select: { senderEmail: true, senderName: true, isFromUser: true, linksJson: true, attachmentsJson: true },
            },
          },
        },
      },
    }),
    prisma.actionItem.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}
