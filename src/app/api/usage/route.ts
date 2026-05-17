import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAiUsage } from '@/lib/plan'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const usage = await getUserAiUsage(session.user.id)

  // Breakdown by call type this month — useful for the transparency UI
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const breakdown = await prisma.aiClassificationLog.groupBy({
    by: ['callType', 'usedDefaultKey'],
    where: {
      userId: session.user.id,
      createdAt: { gte: monthStart },
    },
    _count: { _all: true },
  })

  const byType = {
    classify:   { default: 0, byok: 0 },
    suggest:    { default: 0, byok: 0 },
    draft:      { default: 0, byok: 0 },
  } as Record<string, { default: number; byok: number }>

  for (const row of breakdown) {
    const t = row.callType || 'classify'
    if (!byType[t]) byType[t] = { default: 0, byok: 0 }
    if (row.usedDefaultKey) byType[t].default += row._count._all
    else                    byType[t].byok    += row._count._all
  }

  return NextResponse.json({ ...usage, byType })
}
