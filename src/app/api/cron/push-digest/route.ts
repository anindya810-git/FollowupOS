import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPausedUserIds } from '@/lib/pause'
import { safeLog } from '@/lib/safe-log'

async function runPushDigest() {
  const today = new Date().toISOString().split('T')[0]
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })
  const paused = await getPausedUserIds()

  let sent = 0
  for (const { userId } of subs) {
    if (paused.has(userId)) continue  // vacation mode — no push digest
    const [openCount, overdueItems] = await Promise.all([
      prisma.actionItem.count({ where: { userId, status: 'open' } }),
      prisma.actionItem.count({
        where: { userId, status: 'open', dueDate: { lt: today } },
      }),
    ])
    if (openCount === 0) continue
    const body =
      overdueItems > 0
        ? `${overdueItems} overdue · ${openCount} open follow-ups`
        : `${openCount} follow-ups pending today`
    try {
      await sendPushToUser(userId, { title: 'Pendingly', body, url: '/dashboard' })
      sent++
    } catch (e) {
      safeLog('error', 'push-digest', e, { userId })
    }
  }
  return { sent }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runPushDigest())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runPushDigest())
}
