import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'
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

  let sent = 0
  let failed = 0

  for (const msg of due) {
    try {
      const account = await prisma.emailAccount.findUnique({ where: { id: msg.emailAccountId } })
      if (!account) {
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: 'failed', errorMessage: 'Email account not found' },
        })
        failed++
        continue
      }

      if (account.provider === 'gmail') {
        await sendGmailReply(account.id, msg.threadId || '', msg.toEmail, msg.subject, msg.contentHtml)
      } else if (account.provider === 'outlook') {
        await sendOutlookReply(account.id, msg.threadId || '', msg.toEmail, msg.subject, msg.contentHtml, msg.lastMessageId ?? undefined)
      } else {
        await sendSmtpReply(account.id, msg.toEmail, msg.subject, msg.contentHtml, msg.lastMessageId ?? undefined)
      }

      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: 'sent', sentAt: new Date() },
      })

      if (msg.actionItemId) {
        await prisma.actionItem.update({
          where: { id: msg.actionItemId },
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

  return { processed: due.length, sent, failed }
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
