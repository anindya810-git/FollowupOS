import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addPlanDays } from '@/lib/plan'

// POST { platform? } — record a share event. Max one bonus per user per day.
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { platform?: unknown } = {}
  try { body = await request.json() } catch { /* optional body */ }
  const platform = typeof body.platform === 'string' ? body.platform.slice(0, 32) : null

  // One 7-day bonus per calendar day
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const alreadySharedToday = await prisma.shareEvent.findFirst({
    where: { userId: session.user.id, createdAt: { gte: todayStart } },
  })

  const DAYS = 7
  let daysAdded = 0
  let newExpiry: Date | null = null

  if (!alreadySharedToday) {
    await prisma.shareEvent.create({
      data: { userId: session.user.id, platform },
    })
    newExpiry = await addPlanDays(session.user.id, DAYS)
    daysAdded = DAYS
  }

  const totalShares = await prisma.shareEvent.count({ where: { userId: session.user.id } })

  return NextResponse.json({ ok: true, daysAdded, newExpiry, totalShares })
}
