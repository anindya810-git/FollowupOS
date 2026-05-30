import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendGmailReply } from '@/lib/gmail'
import { sendOutlookReply } from '@/lib/outlook'
import { sendSmtpReply } from '@/lib/smtp'
import { safeLog } from '@/lib/safe-log'

// Approve (send now) or reject (discard) a pending auto-follow-up draft.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const action = body.action

  const msg = await prisma.scheduledMessage.findFirst({
    where: { id, userId: session.user.id, status: 'awaiting_approval' },
  })
  if (!msg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (action === 'reject') {
    await prisma.scheduledMessage.update({ where: { id: msg.id }, data: { status: 'cancelled' } })
    return NextResponse.json({ ok: true, status: 'cancelled' })
  }

  if (action !== 'approve') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  // Claim the row so a double-tap can't send twice.
  const claim = await prisma.scheduledMessage.updateMany({
    where: { id: msg.id, status: 'awaiting_approval' },
    data: { status: 'sending' },
  })
  if (claim.count === 0) {
    return NextResponse.json({ error: 'Already handled' }, { status: 409 })
  }

  try {
    const account = await prisma.emailAccount.findFirst({
      where: { id: msg.emailAccountId, userId: msg.userId },
    })
    if (!account || account.connectedStatus !== 'connected') {
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: 'failed', errorMessage: 'Email account not available' },
      })
      return NextResponse.json({ error: 'Email account not available' }, { status: 400 })
    }

    if (account.provider === 'gmail') {
      await sendGmailReply(account.id, msg.threadId || '', msg.toEmail, msg.subject, msg.contentHtml)
    } else if (account.provider === 'outlook') {
      await sendOutlookReply(account.id, msg.threadId || '', msg.toEmail, msg.subject, msg.contentHtml, msg.lastMessageId ?? undefined)
    } else {
      const inReplyTo = msg.lastRfcMessageId ?? msg.lastMessageId ?? undefined
      await sendSmtpReply(account.id, msg.toEmail, msg.subject, msg.contentHtml, inReplyTo)
    }

    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: { status: 'sent', sentAt: new Date() },
    })

    // Advance the follow-up so the sequence progresses, mirroring the cron.
    if (msg.actionItemId) {
      const now = new Date()
      await prisma.actionItem.updateMany({
        where: { id: msg.actionItemId, userId: msg.userId },
        data: { lastActivityAt: now, lastAutoFollowupAt: now, followupStep: { increment: 1 } },
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, status: 'sent' })
  } catch (e) {
    safeLog('error', 'approval-send', e, { id: msg.id })
    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: { status: 'awaiting_approval', errorMessage: e instanceof Error ? e.message : 'Send failed' },
    }).catch(() => {})
    return NextResponse.json({ error: 'Failed to send. The account may need to be reconnected.' }, { status: 500 })
  }
}
