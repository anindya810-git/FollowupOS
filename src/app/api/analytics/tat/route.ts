import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const doneItems = await prisma.actionItem.findMany({
    where: {
      userId,
      status: 'done',
      completedAt: { not: null },
    },
    select: {
      category: true,
      createdAt: true,
      completedAt: true,
    },
  })

  // Group by category and compute average days
  const categoryMap: Record<string, { totalMs: number; count: number }> = {}
  let overallTotalMs = 0
  let overallCount = 0

  for (const item of doneItems) {
    if (!item.completedAt) continue
    const ms = item.completedAt.getTime() - item.createdAt.getTime()
    if (ms < 0) continue // skip data anomalies

    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { totalMs: 0, count: 0 }
    }
    categoryMap[item.category].totalMs += ms
    categoryMap[item.category].count++
    overallTotalMs += ms
    overallCount++
  }

  const byCategory = Object.entries(categoryMap)
    .map(([category, { totalMs, count }]) => ({
      category,
      avgDays: Math.round((totalMs / count / 86400000) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const overall = overallCount > 0
    ? Math.round((overallTotalMs / overallCount / 86400000) * 10) / 10
    : 0

  return NextResponse.json({ byCategory, overall })
}
