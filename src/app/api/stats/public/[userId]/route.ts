import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint — no auth required — for the shareable stats card
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [handled, replyNeededDone, replyNeededTotal] = await Promise.all([
    prisma.actionItem.count({
      where: { userId, status: 'done', completedAt: { gte: monthStart } },
    }),
    prisma.actionItem.count({
      where: { userId, category: 'reply_needed', status: 'done', completedAt: { gte: monthStart } },
    }),
    prisma.actionItem.count({
      where: { userId, category: 'reply_needed', createdAt: { gte: monthStart } },
    }),
  ])

  const replyRate = replyNeededTotal > 0
    ? Math.round((replyNeededDone / replyNeededTotal) * 100)
    : null

  const period = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return NextResponse.json({
    name: user.name || 'A Pendingly user',
    period,
    handled,
    replyRate,
  })
}
