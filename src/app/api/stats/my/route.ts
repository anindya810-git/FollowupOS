import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [allThisMonth, doneThisMonth, replyNeededDone] = await Promise.all([
    prisma.actionItem.count({
      where: { userId: session.user.id, createdAt: { gte: monthStart } },
    }),
    prisma.actionItem.count({
      where: { userId: session.user.id, status: 'done', completedAt: { gte: monthStart } },
    }),
    prisma.actionItem.count({
      where: {
        userId: session.user.id,
        category: 'reply_needed',
        status: 'done',
        completedAt: { gte: monthStart },
      },
    }),
  ])

  const replyNeededTotal = await prisma.actionItem.count({
    where: {
      userId: session.user.id,
      category: 'reply_needed',
      createdAt: { gte: monthStart },
    },
  })

  // Average response time for done reply_needed items this month
  const respondedItems = await prisma.actionItem.findMany({
    where: {
      userId: session.user.id,
      category: 'reply_needed',
      status: 'done',
      completedAt: { gte: monthStart },
    },
    select: { createdAt: true, completedAt: true },
  })

  let avgResponseHours: number | null = null
  if (respondedItems.length > 0) {
    const totalMs = respondedItems.reduce((sum, item) => {
      const diff = (item.completedAt?.getTime() ?? 0) - item.createdAt.getTime()
      return sum + Math.max(0, diff)
    }, 0)
    avgResponseHours = Math.round(totalMs / respondedItems.length / 3_600_000)
  }

  const replyRate = replyNeededTotal > 0
    ? Math.round((replyNeededDone / replyNeededTotal) * 100)
    : null

  const period = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // All-time totals
  const [totalAllTime, doneAllTime] = await Promise.all([
    prisma.actionItem.count({ where: { userId: session.user.id } }),
    prisma.actionItem.count({ where: { userId: session.user.id, status: 'done' } }),
  ])

  return NextResponse.json({
    period,
    thisMonth: {
      total: allThisMonth,
      handled: doneThisMonth,
      replyRate,
      avgResponseHours,
    },
    allTime: {
      total: totalAllTime,
      handled: doneAllTime,
    },
  })
}
