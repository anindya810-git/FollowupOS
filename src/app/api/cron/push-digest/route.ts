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
  // Tomorrow's date (YYYY-MM-DD). Commitments due today/tomorrow (or overdue)
  // trigger a reminder so the user doesn't break their word.
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().split('T')[0]

  const paused = await getPausedUserIds()

  let sent = 0
  let commitmentRemindersSent = 0
  for (const { userId } of subs) {
    if (paused.has(userId)) continue  // vacation mode — no push digest

    // Reply-deadline reminders: commitments the USER made (owner_type=user)
    // that are due soon and we haven't reminded about yet.
    try {
      const commitments = await prisma.actionItem.findMany({
        where: {
          userId,
          status: 'open',
          category: 'commitment_detected',
          ownerType: 'user',
          commitmentRemindedAt: null,
          dueDate: { lte: tomorrow },
        },
        select: { id: true, title: true, commitmentText: true, dueDate: true },
        take: 10,
      })
      if (commitments.length > 0) {
        const first = commitments[0]
        const what = first.commitmentText || first.title || 'a commitment'
        const body = commitments.length === 1
          ? `Don't forget: ${what}${first.dueDate ? ` (due ${first.dueDate})` : ''}`
          : `You have ${commitments.length} commitments coming due — don't let them slip`
        await sendPushToUser(userId, { title: '⏰ Reply deadline', body, url: '/queue' })
        await prisma.actionItem.updateMany({
          where: { id: { in: commitments.map(c => c.id) } },
          data: { commitmentRemindedAt: new Date() },
        })
        commitmentRemindersSent++
      }
    } catch (e) {
      // New columns (commitmentRemindedAt) may not exist yet — never break the digest.
      safeLog('warn', 'commitment-reminder', e, { userId })
    }

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
  return { sent, commitmentRemindersSent }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runPushDigest())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runPushDigest())
}
