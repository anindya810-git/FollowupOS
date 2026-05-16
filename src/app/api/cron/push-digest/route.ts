import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const today = new Date().toISOString().split('T')[0]
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  let sent = 0
  for (const { userId } of subs) {
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
      console.error('Push send failed for', userId, e)
    }
  }
  return NextResponse.json({ sent })
}
