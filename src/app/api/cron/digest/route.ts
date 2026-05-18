import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSlackDigest } from '@/lib/slack'
import { sendTeamsDigest } from '@/lib/teams'
import { sendEmailDigest } from '@/lib/email-digest'
import { sendWhatsAppDigest } from '@/lib/whatsapp'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { safeLog } from '@/lib/safe-log'

async function runDigest() {
  const settings = await prisma.digestSettings.findMany({
    where: { isEnabled: true },
    include: { user: { select: { name: true, email: true, phone: true } } },
  })

  const today = new Date().toISOString().split('T')[0]
  let slackSent = 0
  let teamsSent = 0
  let emailSent = 0
  let whatsappSent = 0

  for (const s of settings) {
    const [totalOpen, overdueItems, topItems] = await Promise.all([
      prisma.actionItem.count({ where: { userId: s.userId, status: 'open' } }),
      prisma.actionItem.findMany({
        where: { userId: s.userId, status: 'open', dueDate: { lt: today } },
        select: { id: true },
      }),
      prisma.actionItem.findMany({
        where: { userId: s.userId, status: 'open' },
        orderBy: [{ priority: 'desc' }, { lastActivityAt: 'desc' }],
        take: 5,
        select: { title: true, reason: true, category: true, ownerName: true },
      }),
    ])

    const digestPayload = {
      userName: s.user.name ?? undefined,
      totalOpen,
      overdueCount: overdueItems.length,
      topItems: topItems.map(i => ({ title: i.title ?? 'Untitled', reason: i.reason ?? '', category: i.category, ownerName: i.ownerName })),
    }

    if (s.slackEnabled && s.slackWebhookUrl) {
      try {
        await sendSlackDigest(s.slackWebhookUrl, digestPayload)
        slackSent++
      } catch (e) {
        safeLog('error', 'digest:slack', e, { userId: s.userId })
      }
    }

    if (s.teamsEnabled && s.teamsWebhookUrl) {
      try {
        await sendTeamsDigest(s.teamsWebhookUrl, digestPayload)
        teamsSent++
      } catch (e) {
        safeLog('error', 'digest:teams', e, { userId: s.userId })
      }
    }

    if (s.isEnabled && s.user.email) {
      try {
        await sendEmailDigest(s.user.email, digestPayload)
        emailSent++
      } catch (e) {
        if (e instanceof Error && e.message.includes('DIGEST_SMTP_HOST')) {
          // not configured, skip silently
        } else {
          safeLog('error', 'digest:email', e, { userId: s.userId })
        }
      }
    }

    if (s.whatsappEnabled && s.user.phone) {
      try {
        await sendWhatsAppDigest(s.user.phone, digestPayload)
        whatsappSent++
      } catch (e) {
        if (e instanceof Error && e.message.includes('WhatsApp not configured')) {
          // not configured, skip silently
        } else {
          safeLog('error', 'digest:whatsapp', e, { userId: s.userId })
        }
      }
    }
  }

  return { slackSent, teamsSent, emailSent, whatsappSent }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runDigest())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runDigest())
}
