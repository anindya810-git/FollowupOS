import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAiUsage } from '@/lib/plan'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  const monthStart = new Date(now)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)

  // Selectable time window for the breakdown tables. Defaults to this month.
  const range = request.nextUrl.searchParams.get('range') || 'month'
  let rangeStart: Date | null
  switch (range) {
    case 'today': rangeStart = dayStart; break
    case '7d':    rangeStart = new Date(now.getTime() - 7 * 86400_000); break
    case '30d':   rangeStart = new Date(now.getTime() - 30 * 86400_000); break
    case 'all':   rangeStart = null; break
    case 'month':
    default:      rangeStart = monthStart; break
  }

  const [usage, monthlyRows, todayRows, rangeRows] = await Promise.all([
    getUserAiUsage(session.user.id),

    // Monthly: group by callType + modelProvider + usedDefaultKey
    prisma.aiClassificationLog.groupBy({
      by: ['callType', 'modelProvider', 'usedDefaultKey'],
      where: { userId: session.user.id, createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),

    // Today: group by callType + modelProvider + usedDefaultKey
    prisma.aiClassificationLog.groupBy({
      by: ['callType', 'modelProvider', 'usedDefaultKey'],
      where: { userId: session.user.id, createdAt: { gte: dayStart } },
      _count: { _all: true },
    }),

    // Selected range: group by callType + modelProvider + usedDefaultKey
    prisma.aiClassificationLog.groupBy({
      by: ['callType', 'modelProvider', 'usedDefaultKey'],
      where: {
        userId: session.user.id,
        ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),
      },
      _count: { _all: true },
    }),
  ])

  // Helper: build { classify/suggest/draft → { default, byok } } shape
  function buildByType(rows: typeof monthlyRows) {
    const out: Record<string, { default: number; byok: number }> = {
      classify: { default: 0, byok: 0 },
      suggest:  { default: 0, byok: 0 },
      draft:    { default: 0, byok: 0 },
    }
    for (const row of rows) {
      const t = row.callType || 'classify'
      if (!out[t]) out[t] = { default: 0, byok: 0 }
      if (row.usedDefaultKey) out[t].default += row._count._all
      else                    out[t].byok    += row._count._all
    }
    return out
  }

  // Helper: build { provider → { default, byok } } shape
  function buildByProvider(rows: typeof monthlyRows) {
    const out: Record<string, { default: number; byok: number }> = {}
    for (const row of rows) {
      const p = row.modelProvider || 'unknown'
      if (!out[p]) out[p] = { default: 0, byok: 0 }
      if (row.usedDefaultKey) out[p].default += row._count._all
      else                    out[p].byok    += row._count._all
    }
    return out
  }

  const byType        = buildByType(monthlyRows)
  const byProvider    = buildByProvider(monthlyRows)
  const todayByType   = buildByType(todayRows)
  const todayByProvider = buildByProvider(todayRows)
  const todayTotal    = todayRows.reduce((sum, r) => sum + r._count._all, 0)

  const rangeByType     = buildByType(rangeRows)
  const rangeByProvider = buildByProvider(rangeRows)
  const rangeTotal      = rangeRows.reduce((sum, r) => sum + r._count._all, 0)

  return NextResponse.json({
    ...usage,
    byType,
    byProvider,
    todayTotal,
    todayByType,
    todayByProvider,
    range,
    rangeTotal,
    rangeByType,
    rangeByProvider,
  })
}
