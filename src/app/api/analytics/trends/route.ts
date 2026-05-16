import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function toWeekStr(d: Date): string {
  // ISO week: year-Wnn
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30', 10)

  const now = new Date()
  const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)

  const [createdItems, resolvedItems, openItems] = await Promise.all([
    prisma.actionItem.findMany({
      where: { userId, createdAt: { gte: daysAgo } },
      select: { createdAt: true },
    }),
    prisma.actionItem.findMany({
      where: {
        userId,
        status: 'done',
        completedAt: { gte: daysAgo },
      },
      select: { completedAt: true },
    }),
    prisma.actionItem.findMany({
      where: {
        userId,
        status: 'open',
        createdAt: { gte: eightWeeksAgo },
      },
      select: { createdAt: true },
    }),
  ])

  // Build volumeByDay: fill all days in range with 0s first
  const volumeMap: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    volumeMap[toDateStr(d)] = 0
  }
  for (const item of createdItems) {
    const key = toDateStr(item.createdAt)
    if (key in volumeMap) volumeMap[key]++
  }
  const volumeByDay = Object.entries(volumeMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  // Build resolvedByDay
  const resolvedMap: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    resolvedMap[toDateStr(d)] = 0
  }
  for (const item of resolvedItems) {
    if (!item.completedAt) continue
    const key = toDateStr(item.completedAt)
    if (key in resolvedMap) resolvedMap[key]++
  }
  const resolvedByDay = Object.entries(resolvedMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  // Build overdueByWeek (open items grouped by creation week over last 8 weeks)
  const overdueWeekMap: Record<string, number> = {}
  // Initialize 8 weeks
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    overdueWeekMap[toWeekStr(d)] = 0
  }
  for (const item of openItems) {
    const key = toWeekStr(item.createdAt)
    if (key in overdueWeekMap) overdueWeekMap[key]++
  }
  const overdueByWeek = Object.entries(overdueWeekMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({ week, count }))

  return NextResponse.json({ volumeByDay, resolvedByDay, overdueByWeek })
}
