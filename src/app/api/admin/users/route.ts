import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q = searchParams.get('q') ?? ''
  const limit = 50
  const skip = (page - 1) * limit

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        planType: true,
        planExpiresAt: true,
        trialStartedAt: true,
        createdAt: true,
        _count: {
          select: {
            actionItems: true,
            emailAccounts: true,
            payments: { where: { status: 'captured' } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Attach current-month AI call count
  const userIds = users.map(u => u.id)
  const aiCounts = await prisma.aiClassificationLog.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, createdAt: { gte: monthStart } },
    _count: { _all: true },
  })
  const aiCountMap: Record<string, number> = {}
  for (const row of aiCounts) aiCountMap[row.userId] = row._count._all

  const result = users.map(u => ({
    ...u,
    aiCallsThisMonth: aiCountMap[u.id] ?? 0,
  }))

  return NextResponse.json({ users: result, total, page, pages: Math.ceil(total / limit) })
}
