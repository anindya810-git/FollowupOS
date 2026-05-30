import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPausedUserIds } from '@/lib/pause'
import { sendGmailReply } from '@/lib/gmail'
import { sendOutlookReply } from '@/lib/outlook'
import { sendSmtpReply } from '@/lib/smtp'

async function runSendScheduled() {
  const now = new Date()
  const due = await prisma.scheduledMessage.findMany({
    where: { status: 'pending', scheduledFor: { lte: now } },
    take: 50,
    orderBy: { scheduledFor: 'asc' },
  })

  const paused = await getPausedUserIds()

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const msg of due) {
    // Vacation mode — leave the message pending so it goes out once resumed.
    if (paused.has(msg.userId)) { skipped++; continue }
    // Claim the row by flipping pending → sending. If another cron instance
    // (or a slower previous run) already claimed it, count is 0 and we skip.
    const claim = await prisma.scheduledMessage.updateMany({
      where: { id: msg.id, status: 'pending' },
      data: { status: 'sending' },
    })
    if (claim.count === 0) { skipped++; continue }

    try {
      // Verify the email account still belongs to the same user who scheduled
      // the message — accounts can be disconnected / deleted between schedule
      // and send.
      const account = await prisma.emailAccount.findFirst({
        where: { id: msg.emailAccountId, userId: msg.userId },
      })
      if (!account || account.connectedStatus !== 'connected') {
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: 'failed', errorMessage: 'Email account not available' },
        })
        failed++
        continue
      }

      if (account.provider === 'gmail') {
        await sendGmailReply(account.id, msg.threadId || '', msg.toEmail, msg.subject, msg.contentHtml)
      } else if (account.provider === 'outlook') {
        await sendOutlookReply(account.id, msg.threadId || '', msg.toEmail, msg.subject, msg.contentHtml, msg.lastMessageId ?? undefined)
      } else {
        // SMTP/IMAP wants the RFC Message-ID for In-Reply-To.
        const inReplyTo = msg.lastRfcMessageId ?? msg.lastMessageId ?? undefined
        await sendSmtpReply(account.id, msg.toEmail, msg.subject, msg.contentHtml, inReplyTo)
      }

      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: 'sent', sentAt: new Date() },
      })

      if (msg.actionItemId) {
        await prisma.actionItem.updateMany({
          where: { id: msg.actionItemId, userId: msg.userId },
          data: { status: 'done', completedAt: new Date() },
        }).catch(() => {})
      }
      sent++
    } catch (e) {
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'unknown' },
      })
      failed++
    }
  }

  return { processed: due.length, sent, failed, skipped }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runSendScheduled()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runSendScheduled()
  return NextResponse.json(result)
}
