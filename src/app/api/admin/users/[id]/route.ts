import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [user, payments, aiLogs, referrals, shareEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        planType: true,
        planExpiresAt: true,
        trialStartedAt: true,
        createdAt: true,
        referralCode: true,
        emailAccounts: {
          select: { id: true, emailAddress: true, provider: true, createdAt: true },
        },
      },
    }),
    prisma.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aiClassificationLog.groupBy({
      by: ['callType', 'usedDefaultKey'],
      where: { userId: id, createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: id },
      include: { referred: { select: { email: true, name: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shareEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Build AI usage breakdown
  const usageSummary: Record<string, { metered: number; byok: number }> = {}
  for (const row of aiLogs) {
    const t = row.callType
    if (!usageSummary[t]) usageSummary[t] = { metered: 0, byok: 0 }
    if (row.usedDefaultKey) usageSummary[t].metered += row._count._all
    else usageSummary[t].byok += row._count._all
  }

  // All-time AI usage
  const allTimeCount = await prisma.aiClassificationLog.count({ where: { userId: id } })

  // Total revenue from this user
  const totalRevenueCents = payments
    .filter(p => p.status === 'captured')
    .reduce((s, p) => {
      const usd = p.currency === 'INR' ? p.amountCents / 83 : p.amountCents
      return s + usd
    }, 0)

  return NextResponse.json({
    user,
    payments,
    aiUsageThisMonth: usageSummary,
    allTimeAiCalls: allTimeCount,
    referrals,
    shareEvents,
    totalRevenueUSD: Math.round(totalRevenueCents) / 100,
  })
}

// Admin can update a user's plan directly
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: { planType?: string; planExpiresAt?: string | null }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.planType) data.planType = body.planType
  if (body.planExpiresAt !== undefined) {
    data.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null
  }

  await prisma.user.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}
