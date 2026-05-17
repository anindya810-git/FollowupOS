import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { content?: string; subject?: string; scheduledFor?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.content) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  if (!body.scheduledFor) return NextResponse.json({ error: 'scheduledFor required' }, { status: 400 })

  const scheduledFor = new Date(body.scheduledFor)
  if (isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledFor' }, { status: 400 })
  }
  if (scheduledFor.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: 'scheduledFor must be in the future' }, { status: 400 })
  }

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emailThread: {
        include: {
          emailAccount: true,
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        },
      },
    },
  })
  if (!item || !item.emailThread) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const account = item.emailThread.emailAccount
  const toEmail = item.ownerEmail || item.emailThread.messages[0]?.senderEmail
  if (!toEmail) return NextResponse.json({ error: 'No recipient' }, { status: 400 })

  const subject = body.subject
    || (item.emailThread.subject?.startsWith('Re:')
      ? item.emailThread.subject
      : `Re: ${item.emailThread.subject ?? ''}`)

  const scheduled = await prisma.scheduledMessage.create({
    data: {
      userId: session.user.id,
      actionItemId: id,
      emailAccountId: account.id,
      toEmail,
      subject,
      contentHtml: body.content,
      scheduledFor,
      threadId: item.emailThread.providerThreadId,
      lastMessageId: item.emailThread.messages[0]?.providerMessageId ?? null,
    },
  })

  // Mark the action item as snoozed until the scheduled send time
  await prisma.actionItem.update({
    where: { id },
    data: { status: 'snoozed', snoozedUntil: scheduledFor.toISOString().split('T')[0] },
  })

  return NextResponse.json({ ok: true, id: scheduled.id, scheduledFor: scheduledFor.toISOString() })
}
