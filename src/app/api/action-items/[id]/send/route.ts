import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendGmailReply } from '@/lib/gmail'
import { sendOutlookReply } from '@/lib/outlook'
import { sendSmtpReply } from '@/lib/smtp'
import { safeLog } from '@/lib/safe-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { content?: string; subject?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
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
  if (!toEmail) {
    return NextResponse.json({ error: 'No recipient' }, { status: 400 })
  }

  const subject = body.subject
    || (item.emailThread.subject?.startsWith('Re:')
      ? item.emailThread.subject
      : `Re: ${item.emailThread.subject ?? ''}`)

  try {
    const lastMsg = item.emailThread.messages[0]
    if (account.provider === 'gmail') {
      await sendGmailReply(account.id, item.emailThread.providerThreadId, toEmail, subject, body.content)
    } else if (account.provider === 'outlook') {
      await sendOutlookReply(account.id, item.emailThread.providerThreadId, toEmail, subject, body.content, lastMsg?.providerMessageId)
    } else {
      // SMTP/IMAP — use the RFC Message-ID for In-Reply-To so the recipient
      // mail client threads the reply correctly. Fall back to providerMessageId
      // (IMAP UID) if we never captured the RFC id.
      const inReplyTo = lastMsg?.rfcMessageId || lastMsg?.providerMessageId
      await sendSmtpReply(account.id, toEmail, subject, body.content, inReplyTo)
    }

    await prisma.actionItem.update({
      where: { id },
      data: { status: 'done', completedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    safeLog('error', 'send-reply', e, { itemId: id })
    // Generic message — do not echo raw provider errors which may contain
    // tokens, ciphertext fragments, or other sensitive data.
    return NextResponse.json(
      { error: 'Failed to send. The account may need to be reconnected.' },
      { status: 500 },
    )
  }
}
