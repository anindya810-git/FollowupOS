import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSlackDigest } from '@/lib/slack'

// Called by external cron (Vercel Cron / GitHub Actions) with secret header
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.digestSettings.findMany({
    where: { isEnabled: true, slackEnabled: true, slackWebhookUrl: { not: null } },
    include: { user: { select: { name: true, email: true } } },
  })

  const today = new Date().toISOString().split('T')[0]
  let sent = 0

  for (const s of settings) {
    if (!s.slackWebhookUrl) continue
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
    try {
      await sendSlackDigest(s.slackWebhookUrl, {
        userName: s.user.name ?? undefined,
        totalOpen,
        overdueCount: overdueItems.length,
        topItems: topItems.map(i => ({ title: i.title ?? 'Untitled', reason: i.reason ?? '', category: i.category, ownerName: i.ownerName })),
      })
      sent++
    } catch (e) {
      console.error('Slack digest failed for user', s.userId, e)
    }
  }

  return NextResponse.json({ sent })
}
