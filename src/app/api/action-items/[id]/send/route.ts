import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendGmailReply } from '@/lib/gmail'
import { sendOutlookReply } from '@/lib/outlook'
import { sendSmtpReply } from '@/lib/smtp'
import { safeLog } from '@/lib/safe-log'
import { getUserPlan, SIGNATURE_HTML, PLAN_LIMITS } from '@/lib/plan'

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
  // Bound inputs so a malformed/oversized client request can't be abused.
  if (typeof body.content !== 'string' || body.content.length > 200_000) {
    return NextResponse.json({ error: 'Content is too large' }, { status: 400 })
  }
  if (body.subject !== undefined && (typeof body.subject !== 'string' || body.subject.length > 2000)) {
    return NextResponse.json({ error: 'Subject is too long' }, { status: 400 })
  }

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emailThread: {
        include: {
          emailAccount: true,
          // Fetch all messages desc so we can find the last inbound sender.
          // Using only messages[0] (most recent) caused self-sends when the
          // user had replied last in the thread.
          messages: { orderBy: { sentAt: 'desc' } },
        },
      },
    },
  })
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Thread-less items (e.g. meeting follow-up drafts) send a brand-new email to
  // the contact (ownerEmail) from the user's connected mailbox, rather than
  // replying into a thread.
  if (!item.emailThread) {
    return sendNewEmail(item, session.user.id, body.content, body.subject, id)
  }

  const account = item.emailThread.emailAccount
  const selfEmail = account.emailAddress.trim().toLowerCase()

  // A reply MUST go to the person we're replying to: the sender of the most
  // recent message that wasn't from us. The AI's `ownerEmail` field is "who
  // should act on this next" (a CRM concept) — it is frequently the user
  // themselves (e.g. "you need to contact X"), so it must NEVER be used as the
  // reply-to address. Using it here caused replies to be addressed to the
  // user's own inbox.
  const lastInbound = item.emailThread.messages.find(
    m => !m.isFromUser && m.senderEmail && m.senderEmail.trim().toLowerCase() !== selfEmail,
  )
  let toEmail = lastInbound?.senderEmail ?? null

  // Fallback only when we genuinely couldn't resolve an inbound sender (rare —
  // e.g. malformed headers): use ownerEmail, but never our own address. The
  // self-comparison is case-insensitive so casing differences can't slip past.
  if (!toEmail && item.ownerEmail && item.ownerEmail.trim().toLowerCase() !== selfEmail) {
    toEmail = item.ownerEmail
  }
  if (!toEmail) {
    return NextResponse.json({ error: 'No recipient' }, { status: 400 })
  }

  const subject = body.subject
    || (item.emailThread.subject?.startsWith('Re:')
      ? item.emailThread.subject
      : `Re: ${item.emailThread.subject ?? ''}`)

  // Append "Sent via Pendingly" footer.
  // Free users always get it. Lite/Pro users get it unless they've disabled it.
  const [userPlan, appSettings] = await Promise.all([
    getUserPlan(session.user.id),
    prisma.appSettings.findUnique({ where: { userId: session.user.id }, select: { emailSignatureEnabled: true } }),
  ])
  const canDisable = PLAN_LIMITS[userPlan.type as keyof typeof PLAN_LIMITS].canDisableSignature
  const sigEnabled = !canDisable || (appSettings?.emailSignatureEnabled ?? true)
  const finalContent = sigEnabled ? `${body.content}${SIGNATURE_HTML}` : body.content

  try {
    const lastMsg = item.emailThread.messages[0]
    if (account.provider === 'gmail') {
      await sendGmailReply(account.id, item.emailThread.providerThreadId, toEmail, subject, finalContent)
    } else if (account.provider === 'outlook') {
      await sendOutlookReply(account.id, item.emailThread.providerThreadId, toEmail, subject, finalContent, lastMsg?.providerMessageId)
    } else {
      // SMTP/IMAP — use the RFC Message-ID for In-Reply-To so the recipient
      // mail client threads the reply correctly. Fall back to providerMessageId
      // (IMAP UID) if we never captured the RFC id.
      const inReplyTo = lastMsg?.rfcMessageId || lastMsg?.providerMessageId
      await sendSmtpReply(account.id, toEmail, subject, finalContent, inReplyTo)
    }

    await prisma.actionItem.updateMany({
      where: { id, userId: session.user.id },
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

// Send a brand-new email (no thread) for thread-less items like meeting
// follow-up drafts. Picks the user's first connected mailbox to send from.
async function sendNewEmail(
  item: { ownerEmail: string | null; title: string | null },
  userId: string,
  content: string | undefined,
  subjectOverride: string | undefined,
  id: string,
) {
  if (!content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }
  const account = await prisma.emailAccount.findFirst({
    where: { userId, connectedStatus: 'connected' },
    orderBy: { createdAt: 'asc' },
  })
  if (!account) {
    return NextResponse.json({ error: 'No connected email account to send from.' }, { status: 400 })
  }
  const toEmail = (item.ownerEmail || '').trim()
  const selfEmail = account.emailAddress.trim().toLowerCase()
  if (!toEmail || toEmail.toLowerCase() === selfEmail) {
    return NextResponse.json({ error: 'No valid recipient for this draft.' }, { status: 400 })
  }
  const subject = subjectOverride || item.title || 'Following up'

  const [userPlan, appSettings] = await Promise.all([
    getUserPlan(userId),
    prisma.appSettings.findUnique({ where: { userId }, select: { emailSignatureEnabled: true } }),
  ])
  const canDisable = PLAN_LIMITS[userPlan.type as keyof typeof PLAN_LIMITS].canDisableSignature
  const sigEnabled = !canDisable || (appSettings?.emailSignatureEnabled ?? true)
  const finalContent = sigEnabled ? `${content}${SIGNATURE_HTML}` : content

  try {
    if (account.provider === 'gmail') {
      await sendGmailReply(account.id, '', toEmail, subject, finalContent)
    } else if (account.provider === 'outlook') {
      await sendOutlookReply(account.id, '', toEmail, subject, finalContent)
    } else {
      await sendSmtpReply(account.id, toEmail, subject, finalContent)
    }
    await prisma.actionItem.update({
      where: { id },
      data: { status: 'done', completedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    safeLog('error', 'send-new-email', e, { itemId: id })
    return NextResponse.json(
      { error: 'Failed to send. The account may need to be reconnected.' },
      { status: 500 },
    )
  }
}
