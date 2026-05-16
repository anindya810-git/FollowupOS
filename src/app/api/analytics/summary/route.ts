import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const today = now.toISOString().split('T')[0]

  const [
    totalOpen,
    resolvedThisWeek,
    resolvedLastWeek,
    doneDueItems,
    allOpen,
  ] = await Promise.all([
    prisma.actionItem.count({ where: { userId, status: 'open' } }),
    prisma.actionItem.count({
      where: {
        userId,
        status: 'done',
        completedAt: { gte: weekAgo },
      },
    }),
    prisma.actionItem.count({
      where: {
        userId,
        status: 'done',
        completedAt: { gte: twoWeeksAgo, lt: weekAgo },
      },
    }),
    prisma.actionItem.findMany({
      where: {
        userId,
        status: 'done',
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
        category: true,
      },
    }),
    prisma.actionItem.findMany({
      where: { userId, status: 'open' },
      select: { dueDate: true, category: true },
    }),
  ])

  // Count overdue: open items with dueDate in the past
  let overdueCount = 0
  for (const item of allOpen) {
    if (item.dueDate && item.dueDate < today) {
      overdueCount++
    }
  }

  // Average TAT in days across all done items
  let avgTatDays = 0
  if (doneDueItems.length > 0) {
    const totalMs = doneDueItems.reduce((sum, item) => {
      if (!item.completedAt) return sum
      return sum + (item.completedAt.getTime() - item.createdAt.getTime())
    }, 0)
    avgTatDays = totalMs / doneDueItems.length / 86400000
  }

  // Top category by open count
  const categoryMap: Record<string, number> = {}
  for (const item of allOpen) {
    categoryMap[item.category] = (categoryMap[item.category] ?? 0) + 1
  }
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Week-over-week change in resolved items
  const weekOverWeekChange =
    resolvedLastWeek === 0
      ? resolvedThisWeek > 0 ? 100 : 0
      : Math.round(((resolvedThisWeek - resolvedLastWeek) / resolvedLastWeek) * 100)

  // Health score formula
  let score = 100
  score -= Math.min(totalOpen * 2, 40)
  score -= Math.min(overdueCount * 5, 30)
  score += Math.min(resolvedThisWeek * 2, 20)
  const healthScore = Math.max(0, Math.min(100, Math.round(score)))

  return NextResponse.json({
    healthScore,
    totalOpen,
    resolvedThisWeek,
    avgTatDays: Math.round(avgTatDays * 10) / 10,
    overdueCount,
    topCategory,
    weekOverWeekChange,
  })
}
