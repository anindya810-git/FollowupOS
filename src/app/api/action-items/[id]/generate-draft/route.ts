import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDraft, resolveAiConfig } from '@/lib/ai'
import { canMakeAiCall } from '@/lib/plan'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const tone = typeof body.tone === 'string' ? body.tone : 'polite'
  const output_type = typeof body.output_type === 'string' ? body.output_type : 'email_reply'

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emailThread: {
        include: {
          messages: {
            orderBy: { sentAt: 'asc' },
          },
        },
      },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [user, aiConfig] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    resolveAiConfig(session.user.id),
  ])
  if (!aiConfig) {
    return NextResponse.json({ error: 'No AI provider configured. Add an API key in Settings → AI Provider.' }, { status: 400 })
  }

  const quota = await canMakeAiCall(session.user.id, aiConfig.isDefaultKey)
  if (!quota.ok) {
    return NextResponse.json({ error: quota.reason, quota_exceeded: true }, { status: 429 })
  }

  const draft = await generateDraft({
    threadSubject: item.title || item.emailThread?.subject || 'Email Thread',
    reason: item.reason || '',
    suggestedAction: item.suggestedAction || '',
    messages: (item.emailThread?.messages || []).map((m: any) => ({
      from: m.senderEmail || '',
      body: m.bodyExcerpt || m.snippet || '',
      isFromUser: m.isFromUser,
      sentAt: m.sentAt ? m.sentAt.toISOString() : undefined,
    })),
    tone,
    outputType: output_type,
    userName: user?.name || session.user.email || 'User',
    config: aiConfig,
  })

  if (!draft) {
    return NextResponse.json({ error: 'Draft generation failed' }, { status: 500 })
  }

  // Meter the call
  await prisma.aiClassificationLog.create({
    data: {
      userId: session.user.id,
      emailThreadId: item.emailThreadId,
      modelProvider: aiConfig.provider,
      modelName: aiConfig.model,
      usedDefaultKey: aiConfig.isDefaultKey,
      callType: 'draft',
    },
  })

  return NextResponse.json(draft)
}
