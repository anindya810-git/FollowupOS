import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_FOLLOWUP_TEMPLATE, renderTemplate } from '@/lib/templates'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { safeLog } from '@/lib/safe-log'

async function runAutoFollowup() {
  const enabledUsers = await prisma.appSettings.findMany({
    where: { autoFollowupEnabled: true },
  })

  let sent = 0
  let failed = 0

  for (const settings of enabledUsers) {
    const intervalMs = settings.autoFollowupDays * 86400_000
    const cutoff = new Date(Date.now() - intervalMs)

    // Pre-load this user's ignored sender list so we never auto-followup them
    const ignored = await prisma.ignoredSender.findMany({
      where: { userId: settings.userId },
      select: { senderEmail: true, domain: true },
    })
    const ignoredEmails = new Set(ignored.map(i => (i.senderEmail || '').toLowerCase()).filter(Boolean))
    const ignoredDomains = new Set(ignored.map(i => (i.domain || '').toLowerCase()).filter(Boolean))

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

    const template = settings.autoFollowupTemplate || DEFAULT_FOLLOWUP_TEMPLATE
    const signature = settings.signatureHtml ?? ''

    for (const item of items) {
      if (!item.emailThread || !item.ownerEmail) continue
      const targetEmail = item.ownerEmail.toLowerCase()
      const targetDomain = targetEmail.split('@')[1] || ''
      if (ignoredEmails.has(targetEmail) || ignoredDomains.has(targetDomain)) continue

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
            reason: `Auto-follow-up sent on ${now.toISOString().split('T')[0]}`,
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
