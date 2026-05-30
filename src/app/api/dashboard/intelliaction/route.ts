import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SerializableItem {
  id: string
  title: string | null
  reason: string | null
  ownerName: string | null
  ownerEmail: string | null
  category: string
  priority: string
  dueDate: string | null
  lastActivityAt: Date | null
  emailThread: {
    subject: string | null
    providerUrl: string | null
    emailAccount: { provider: string; emailAddress: string } | null
  } | null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [allOpen, doneToday, appSettings] = await Promise.all([
    prisma.actionItem.findMany({
      where: { userId, status: 'open' },
      orderBy: [{ priority: 'asc' }, { lastActivityAt: 'desc' }],
      include: {
        emailThread: {
          select: {
            subject: true, providerUrl: true, lastMessageAt: true, participants: true,
            emailAccount: { select: { provider: true, emailAddress: true } },
          },
        },
      },
      take: 200,
    }),
    prisma.actionItem.count({
      where: {
        userId,
        status: 'done',
        completedAt: { gte: startOfToday },
      },
    }),
    prisma.appSettings.findUnique({ where: { userId } }),
  ])

  const visible = allOpen.filter(item => {
    if (!item.snoozedUntil) return true
    return item.snoozedUntil <= today
  })

  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  visible.sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 3
    const pb = priorityRank[b.priority] ?? 3
    if (pa !== pb) return pa - pb
    const la = a.lastActivityAt?.getTime() ?? 0
    const lb = b.lastActivityAt?.getTime() ?? 0
    return lb - la
  })

  const urgent = visible.filter(item => {
    if (item.category === 'overdue_commitment') return true
    if (item.dueDate && item.dueDate < today) return true
    if (item.priority === 'high' && item.category === 'reply_needed') return true
    return false
  })

  const urgentIds = new Set(urgent.map(i => i.id))
  const reply = visible.filter(item =>
    !urgentIds.has(item.id) && item.category === 'reply_needed'
  )

  const quickReply = reply.filter(item =>
    (item.reason?.length ?? 0) < 80 || item.priority === 'low'
  )
  const deeperReply = reply.filter(item => !quickReply.includes(item))

  const chase = visible.filter(item => {
    if (item.category !== 'waiting_on_them') return false
    if (urgentIds.has(item.id)) return false
    if (!item.lastActivityAt) return true
    return item.lastActivityAt < threeDaysAgo
  })

  const otherIds = new Set([...urgentIds, ...reply.map(i => i.id), ...chase.map(i => i.id)])
  const other = visible.filter(item =>
    !otherIds.has(item.id) &&
    (item.category === 'followup_due' || item.category === 'commitment_detected')
  )

  const estimatedMinutes = Math.ceil(
    urgent.length * 2 +
      quickReply.length * 1 +
      deeperReply.length * 3 +
      chase.length * 0.5 +
      other.length * 1.5
  )

  const hour = now.getHours()
  let greeting = 'Hello'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 17) greeting = 'Good afternoon'
  else greeting = 'Good evening'

  return NextResponse.json({
    greeting,
    dateLabel: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    estimatedMinutes,
    doneToday,
    tiers: {
      urgent: urgent.slice(0, 5).map(serializeItem),
      quickReply: quickReply.slice(0, 8).map(serializeItem),
      deeperReply: deeperReply.slice(0, 5).map(serializeItem),
      chase: chase.slice(0, 8).map(serializeItem),
      other: other.slice(0, 5).map(serializeItem),
    },
    counts: {
      urgent: urgent.length,
      quickReply: quickReply.length,
      deeperReply: deeperReply.length,
      chase: chase.length,
      other: other.length,
    },
    autoFollowupEnabled: appSettings?.autoFollowupEnabled ?? false,
  })
}

function serializeItem(item: SerializableItem) {
  return {
    id: item.id,
    title: item.title || item.emailThread?.subject || 'No subject',
    reason: item.reason,
    ownerName: item.ownerName,
    ownerEmail: item.ownerEmail,
    category: item.category,
    priority: item.priority,
    dueDate: item.dueDate,
    lastActivityAt: item.lastActivityAt,
    providerUrl: item.emailThread?.providerUrl ?? null,
    inboxEmail: item.emailThread?.emailAccount?.emailAddress ?? null,
    inboxProvider: item.emailThread?.emailAccount?.provider ?? null,
  }
}
