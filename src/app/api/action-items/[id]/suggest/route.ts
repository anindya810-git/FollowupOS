import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQuickSuggestion } from '@/lib/ai'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        include: {
          messages: { orderBy: { sentAt: 'asc' } },
        },
      },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  const suggestion = await generateQuickSuggestion({
    threadSubject: item.title || item.emailThread?.subject || 'Email Thread',
    reason: item.reason || '',
    messages: (item.emailThread?.messages || []).map(m => ({
      from: m.senderEmail || '',
      body: m.bodyExcerpt || m.snippet || '',
      isFromUser: m.isFromUser,
      sentAt: m.sentAt ? m.sentAt.toISOString() : undefined,
    })),
    repeatedAskCount: item.repeatedAskCount,
    userName: user?.name || session.user.email || 'User',
  })

  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion generation failed' }, { status: 500 })
  }

  await prisma.actionItem.update({
    where: { id },
    data: { autoReplySuggestion: suggestion },
  })

  return NextResponse.json({ suggestion })
}
