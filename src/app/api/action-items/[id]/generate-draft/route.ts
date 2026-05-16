import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDraft } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { tone = 'polite', output_type = 'email_reply' } = body

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emailThread: {
        include: {
          messages: {
            orderBy: { sentAt: 'asc' },
            take: 5,
          },
        },
      },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  const draft = await generateDraft({
    threadSubject: item.title || item.emailThread?.subject || 'Email Thread',
    reason: item.reason || '',
    suggestedAction: item.suggestedAction || '',
    messages: (item.emailThread?.messages || []).map(m => ({
      from: m.senderEmail || '',
      body: m.bodyExcerpt || m.snippet || '',
      isFromUser: m.isFromUser,
    })),
    tone,
    outputType: output_type,
    userName: user?.name || session.user.email || 'User',
  })

  if (!draft) {
    return NextResponse.json({ error: 'Draft generation failed' }, { status: 500 })
  }

  return NextResponse.json(draft)
}
