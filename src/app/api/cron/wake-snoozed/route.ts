import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { sendPushToUser } from '@/lib/push'
import { safeLog } from '@/lib/safe-log'

async function runWakeSnoozed() {
  // snoozedUntil is stored as 'YYYY-MM-DD' (local-date-ish — see schedule
  // route). Compare lexicographically against today's date in UTC; if the
  // user's timezone differs, a wake-up may be off by up to one day. Close
  // enough until snoozedUntil becomes a real timestamp.
  const today = new Date().toISOString().split('T')[0]

  // Find items first so we can notify per-user before the status flip.
  const toWake = await prisma.actionItem.findMany({
    where: {
      status: 'snoozed',
      snoozedUntil: { lte: today },
    },
    select: { id: true, userId: true, title: true },
  })

  const result = await prisma.actionItem.updateMany({
    where: {
      status: 'snoozed',
      snoozedUntil: { lte: today },
    },
    data: {
      status: 'open',
      snoozedUntil: null,
    },
  })

  // Push reminder per user (one push per user with a count, not per-item spam).
  const byUser = new Map<string, typeof toWake>()
  for (const item of toWake) {
    const list = byUser.get(item.userId) || []
    list.push(item)
    byUser.set(item.userId, list)
  }
  for (const [userId, items] of byUser) {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { userId },
        select: { reminderPushEnabled: true },
      })
      if (settings?.reminderPushEnabled === false) continue
      const count = items.length
      const body = count === 1
        ? `Reminder: ${items[0].title || 'Follow-up'} is back in your queue.`
        : `${count} reminders are back in your queue.`
      await sendPushToUser(userId, {
        title: 'Pendingly',
        body,
        url: count === 1 ? `/queue?status=open` : '/queue',
      })
    } catch (e) {
      safeLog('warn', 'wake-snoozed-push', e, { userId })
    }
  }

  return { woke: result.count }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runWakeSnoozed())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runWakeSnoozed())
}
