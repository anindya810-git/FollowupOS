import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_FOLLOWUP_TEMPLATE, renderTemplate } from '@/lib/templates'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPausedUserIds } from '@/lib/pause'
import { safeLog } from '@/lib/safe-log'

interface SequenceStep { dayOffset: number; tone: string; template: string }

function parseSequence(json: string | null | undefined): SequenceStep[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    return arr.filter(s => typeof s?.dayOffset === 'number' && typeof s?.template === 'string')
  } catch {
    return []
  }
}

async function runAutoFollowup() {
  const enabledUsers = await prisma.appSettings.findMany({
    where: { autoFollowupEnabled: true },
  })
  const paused = await getPausedUserIds()

  let sent = 0
  let failed = 0

  for (const settings of enabledUsers) {
    if (paused.has(settings.userId)) continue  // vacation mode — hold everything
    const sequence = parseSequence(settings.followupSequenceJson)
    // Effective interval: when sequence is configured, the loop below
    // computes step-by-step cutoffs. Otherwise fall back to single-step.
    const intervalMs = settings.autoFollowupDays * 86400_000
    const cutoff = new Date(Date.now() - intervalMs)

    // Pre-load this user's ignored sender list so we never auto-followup them
    const ignored = await prisma.ignoredSender.findMany({
      where: { userId: settings.userId },
      select: { senderEmail: true, domain: true },
    })
    const ignoredEmails = new Set(ignored.map(i => (i.senderEmail || '').toLowerCase()).filter(Boolean))
    const ignoredDomains = new Set(ignored.map(i => (i.domain || '').toLowerCase()).filter(Boolean))

    // When a sequence is configured, eligibility = lastActivityAt older than
    // the *next* step's dayOffset and lastAutoFollowupAt older than that too.
    // Computed per-item below; the DB filter just narrows to items in
    // "waiting" state where some auto-followup *might* be due.
    const items = await prisma.actionItem.findMany({
      where: {
        userId: settings.userId,
        status: 'open',
        category: 'waiting_on_them',
        lastActivityAt: { lt: cutoff },
        ownerEmail: { not: null },
        // Skip items we've already auto-followed-up on within the configured interval
        OR: [
          { lastAutoFollowupAt: null },
          { lastAutoFollowupAt: { lt: cutoff } },
        ],
      },
      include: {
        emailThread: {
          include: {
            emailAccount: true,
            messages: { orderBy: { sentAt: 'desc' }, take: 1 },
          },
        },
      },
      take: 10,
    })

    const fallbackTemplate = settings.autoFollowupTemplate || DEFAULT_FOLLOWUP_TEMPLATE
    const signature = settings.signatureHtml ?? ''

    for (const item of items) {
      if (!item.emailThread || !item.ownerEmail) continue
      const targetEmail = item.ownerEmail.toLowerCase()
      const targetDomain = targetEmail.split('@')[1] || ''
      if (ignoredEmails.has(targetEmail) || ignoredDomains.has(targetDomain)) continue

      // Pick template based on sequence step. followupStep is 0-indexed count of
      // sequence steps already sent. If sequence empty, fall back to single-step.
      let template = fallbackTemplate
      let advanceStep = false
      if (sequence.length > 0) {
        const nextStepIdx = item.followupStep ?? 0
        if (nextStepIdx >= sequence.length) continue  // sequence exhausted
        const step = sequence[nextStepIdx]
        // Honour the step's own dayOffset for spacing
        const stepCutoff = new Date(Date.now() - step.dayOffset * 86400_000)
        if (item.lastActivityAt && item.lastActivityAt > stepCutoff) continue
        if (item.lastAutoFollowupAt && item.lastAutoFollowupAt > stepCutoff) continue
        template = step.template || fallbackTemplate
        advanceStep = true
      }

      const account = item.emailThread.emailAccount
      const rendered = renderTemplate(template, { name: item.ownerName ?? undefined })
      // Template is plain text; wrap as HTML and append signature when present
      const htmlBody = signature
        ? `<p>${rendered.replace(/\n/g, '<br>')}</p><br>${signature}`
        : `<p>${rendered.replace(/\n/g, '<br>')}</p>`
      const body = htmlBody
      const subject = item.emailThread.subject?.startsWith('Re:')
        ? item.emailThread.subject
        : `Re: ${item.emailThread.subject ?? 'Follow up'}`

      // Approval mode: don't send. Queue an awaiting_approval ScheduledMessage
      // the user can approve with one tap. De-dupe so we don't pile up drafts
      // for the same item across cron runs.
      if ((settings as { followupApprovalMode?: boolean }).followupApprovalMode) {
        const lastMsg = item.emailThread.messages[0]
        const already = await prisma.scheduledMessage.findFirst({
          where: { actionItemId: item.id, status: 'awaiting_approval' },
          select: { id: true },
        })
        if (already) continue
        await prisma.scheduledMessage.create({
          data: {
            userId: settings.userId,
            actionItemId: item.id,
            emailAccountId: account.id,
            toEmail: item.ownerEmail,
            subject,
            contentHtml: body,
            scheduledFor: new Date(),
            status: 'awaiting_approval',
            threadId: item.emailThread.providerThreadId,
            lastMessageId: lastMsg?.providerMessageId ?? null,
            lastRfcMessageId: lastMsg?.rfcMessageId ?? null,
          },
        })
        // Record that we've proposed this step so it isn't re-evaluated until
        // the next interval; the step only truly advances on approval.
        await prisma.actionItem.update({
          where: { id: item.id },
          data: { lastAutoFollowupAt: new Date() },
        })
        sent++  // counts as "actioned" for the cron summary
        continue
      }

      try {
        if (account.provider === 'gmail') {
          const mod = await import('@/lib/gmail').catch(() => null)
          if (mod && 'sendGmailReply' in mod) {
            await (mod as { sendGmailReply: (...args: unknown[]) => Promise<unknown> }).sendGmailReply(
              account.id,
              item.emailThread.providerThreadId,
              item.ownerEmail,
              subject,
              body,
            )
          } else {
            throw new Error('sendGmailReply not available')
          }
        } else if (account.provider === 'outlook') {
          const mod = await import('@/lib/outlook').catch(() => null)
          if (mod && 'sendOutlookReply' in mod) {
            const lastMsg = item.emailThread.messages[0]
            await (mod as { sendOutlookReply: (...args: unknown[]) => Promise<unknown> }).sendOutlookReply(
              account.id,
              item.emailThread.providerThreadId,
              item.ownerEmail,
              subject,
              body,
              lastMsg?.providerMessageId,
            )
          } else {
            throw new Error('sendOutlookReply not available')
          }
        } else {
          const mod = await import('@/lib/smtp').catch(() => null)
          if (mod && 'sendSmtpReply' in mod) {
            const lastMsg = item.emailThread.messages[0]
            const inReplyTo = lastMsg?.rfcMessageId || lastMsg?.providerMessageId
            await (mod as { sendSmtpReply: (...args: unknown[]) => Promise<unknown> }).sendSmtpReply(
              account.id,
              item.ownerEmail,
              subject,
              body,
              inReplyTo,
            )
          } else {
            throw new Error('sendSmtpReply not available')
          }
        }

        const now = new Date()
        await prisma.actionItem.update({
          where: { id: item.id },
          data: {
            lastActivityAt: now,
            lastAutoFollowupAt: now,
            ...(advanceStep ? { followupStep: { increment: 1 } } : {}),
            reason: advanceStep
              ? `Sequence step ${(item.followupStep ?? 0) + 1} sent on ${now.toISOString().split('T')[0]}`
              : `Auto-follow-up sent on ${now.toISOString().split('T')[0]}`,
          },
        })
        sent++
      } catch (e) {
        safeLog('error', 'auto-followup', e, { itemId: item.id })
        failed++
      }
    }
  }

  return { sent, failed }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runAutoFollowup())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runAutoFollowup())
}
