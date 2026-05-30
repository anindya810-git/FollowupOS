import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateThreadSummary, resolveAiConfig } from '@/lib/ai'
import { canMakeAiCall } from '@/lib/plan'

interface ThreadMessage {
  senderEmail: string | null
  bodyExcerpt: string | null
  snippet: string | null
  isFromUser: boolean
  sentAt: Date | null
}

// Returns the AI summary of the whole thread. Cached on the action item after
// the first generation (or pre-filled by a future scan), so repeat views are free.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emailThread: {
        include: { messages: { orderBy: { sentAt: 'asc' } } },
      },
    },
  })
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Cached summary — return immediately.
  const cached = (item as { threadSummary?: string | null }).threadSummary
  if (cached) {
    return NextResponse.json({ summary: cached, cached: true })
  }

  const messages = (item.emailThread?.messages ?? []) as ThreadMessage[]
  if (messages.length === 0) {
    return NextResponse.json({ summary: null })
  }

  const aiConfig = await resolveAiConfig(session.user.id)
  if (!aiConfig) {
    return NextResponse.json({ summary: null, error: 'No AI provider configured.' })
  }
  const quota = await canMakeAiCall(session.user.id, aiConfig.isDefaultKey)
  if (!quota.ok) {
    return NextResponse.json({ summary: null, error: quota.reason, quota_exceeded: true }, { status: 429 })
  }

  let summary: string | null = null
  try {
    summary = await generateThreadSummary({
      threadSubject: item.title || item.emailThread?.subject || 'Email thread',
      messages: messages.map(m => ({
        from: m.senderEmail || '',
        body: m.bodyExcerpt || m.snippet || '',
        isFromUser: m.isFromUser,
        sentAt: m.sentAt ? m.sentAt.toISOString() : undefined,
      })),
      config: aiConfig,
    })
  } catch {
    return NextResponse.json({ summary: null, error: 'Could not generate summary.' }, { status: 500 })
  }

  if (summary) {
    // Cache it and meter the call.
    await prisma.actionItem.update({ where: { id }, data: { threadSummary: summary } }).catch(() => {})
    await prisma.aiClassificationLog.create({
      data: {
        userId: session.user.id,
        emailThreadId: item.emailThreadId,
        modelProvider: aiConfig.provider,
        modelName: aiConfig.model,
        usedDefaultKey: aiConfig.isDefaultKey,
        callType: 'summary',
      },
    }).catch(() => {})
  }

  return NextResponse.json({ summary })
}
