import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_FOLLOWUP_TEMPLATE, renderTemplate } from '@/lib/templates'
import { isAuthorizedCron } from '@/lib/cron-auth'

async function runAutoFollowup() {
  const enabledUsers = await prisma.appSettings.findMany({
    where: { autoFollowupEnabled: true },
  })

  let sent = 0
  let failed = 0

  for (const settings of enabledUsers) {
    const intervalMs = settings.autoFollowupDays * 86400_000
    const cutoff = new Date(Date.now() - intervalMs)
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

    for (const item of items) {
      if (!item.emailThread || !item.ownerEmail) continue
      const account = item.emailThread.emailAccount
      const body = renderTemplate(template, { name: item.ownerName ?? undefined })
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
            await (mod as { sendOutlookReply: (...args: unknown[]) => Promise<unknown> }).sendOutlookReply(
              account.id,
              item.emailThread.providerThreadId,
              item.ownerEmail,
              subject,
              body,
            )
          } else {
            throw new Error('sendOutlookReply not available')
          }
        } else {
          const mod = await import('@/lib/smtp').catch(() => null)
          if (mod && 'sendSmtpReply' in mod) {
            const lastMsg = item.emailThread.messages[0]
            await (mod as { sendSmtpReply: (...args: unknown[]) => Promise<unknown> }).sendSmtpReply(
              account.id,
              item.ownerEmail,
              subject,
              body,
              lastMsg?.providerMessageId,
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
        console.error('Auto-followup failed for item', item.id, e)
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
