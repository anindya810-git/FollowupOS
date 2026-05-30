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
  // Cap at 1 year ahead — anything further is almost certainly a typo and
  // would clutter the scheduled-message table indefinitely.
  if (scheduledFor.getTime() > Date.now() + 365 * 86400_000) {
    return NextResponse.json({ error: 'scheduledFor cannot be more than 1 year in the future' }, { status: 400 })
  }

  const [item, user] = await Promise.all([
    prisma.actionItem.findFirst({
      where: { id, userId: session.user.id },
      include: {
        emailThread: {
          include: {
            emailAccount: true,
            // Fetch all messages (newest first) so we can resolve the last
            // inbound sender for the recipient AND the newest message for the
            // In-Reply-To / threading ids.
            messages: { orderBy: { sentAt: 'desc' } },
          },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } }),
  ])
  if (!item || !item.emailThread) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const account = item.emailThread.emailAccount
  const selfEmail = account.emailAddress.trim().toLowerCase()
  // A reply must go to the person we're replying to — the most recent inbound
  // (non-user) sender. ownerEmail is the AI's "who acts next" and is frequently
  // the user's own address, so it must never be the recipient. Self-comparison
  // is case-insensitive. (Mirrors /api/action-items/[id]/send.)
  const lastInbound = item.emailThread.messages.find(
    m => !m.isFromUser && m.senderEmail && m.senderEmail.trim().toLowerCase() !== selfEmail,
  )
  let toEmail = lastInbound?.senderEmail ?? null
  if (!toEmail && item.ownerEmail && item.ownerEmail.trim().toLowerCase() !== selfEmail) {
    toEmail = item.ownerEmail
  }
  if (!toEmail) return NextResponse.json({ error: 'No recipient' }, { status: 400 })

  const subject = body.subject
    || (item.emailThread.subject?.startsWith('Re:')
      ? item.emailThread.subject
      : `Re: ${item.emailThread.subject ?? ''}`)

  const lastMsg = item.emailThread.messages[0]

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
      // providerMessageId is what Outlook needs for the /reply endpoint.
      // rfcMessageId is what SMTP needs for the In-Reply-To header.
      lastMessageId: lastMsg?.providerMessageId ?? null,
      lastRfcMessageId: lastMsg?.rfcMessageId ?? null,
    },
  })

  // Mark the action item as snoozed until the scheduled send time.
  // Compute the date string in the user's own timezone so an 11pm IST send
  // doesn't get snoozed to "tomorrow" by UTC.
  const tz = user?.timezone || 'Asia/Kolkata'
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(scheduledFor) // yields YYYY-MM-DD
  await prisma.actionItem.updateMany({
    where: { id, userId: session.user.id },
    data: { status: 'snoozed', snoozedUntil: localDate },
  })

  return NextResponse.json({ ok: true, id: scheduled.id, scheduledFor: scheduledFor.toISOString() })
}
