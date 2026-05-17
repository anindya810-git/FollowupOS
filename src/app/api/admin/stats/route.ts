import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// Estimated AI cost per metered call (USD). Conservative averages based on
// Anthropic claude-sonnet-4-6 pricing ($3/M input, $15/M output).
const COST_PER_CALL_USD = {
  classify: 0.003,   // ~500 input + 100 output tokens
  suggest:  0.006,   // ~1000 input + 200 output tokens
  draft:    0.014,   // ~2000 input + 500 output tokens
  default:  0.003,
}

const PLAN_PRICE_USD = { lite: 9, pro: 15, free: 0 }

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [usersByPlan, payments, totalUsers] = await Promise.all([
    prisma.user.groupBy({
      by: ['planType'],
      _count: { _all: true },
    }),
    prisma.payment.findMany({
      where: { status: 'captured', createdAt: { gte: monthStart } },
      select: { amountCents: true, currency: true, planType: true, userId: true, createdAt: true },
    }),
    prisma.user.count(),
  ])

  // Active users by tier
  const byTier: Record<string, number> = { free: 0, lite: 0, pro: 0 }
  for (const row of usersByPlan) {
    const t = row.planType as string
    byTier[t] = (byTier[t] ?? 0) + row._count._all
  }

  // MRR from captured payments this month (converted to USD at rough rate)
  // Also compute estimated MRR from active subscriptions
  const revenueThisMonthCents = payments.reduce((s, p) => {
    // Normalize to USD cents (assume INR: divide by 83)
    const usdCents = p.currency === 'INR' ? Math.round(p.amountCents / 83) : p.amountCents
    return s + usdCents
  }, 0)
  const revenueUSD = revenueThisMonthCents / 100

  // Estimated MRR from plan distribution
  const estimatedMRR =
    (byTier.lite ?? 0) * PLAN_PRICE_USD.lite +
    (byTier.pro ?? 0) * PLAN_PRICE_USD.pro

  // AI cost estimate for metered calls this month
  const aiLogCount = await prisma.aiClassificationLog.groupBy({
    by: ['callType'],
    where: { usedDefaultKey: true, createdAt: { gte: monthStart } },
    _count: { _all: true },
  })
  let totalAiCostUSD = 0
  for (const row of aiLogCount) {
    const costPer = COST_PER_CALL_USD[row.callType as keyof typeof COST_PER_CALL_USD]
      ?? COST_PER_CALL_USD.default
    totalAiCostUSD += costPer * row._count._all
  }
  const totalAiCalls = aiLogCount.reduce((s, r) => s + r._count._all, 0)

  // Gross margin
  const grossMarginUSD = revenueUSD - totalAiCostUSD
  const grossMarginPct = revenueUSD > 0 ? (grossMarginUSD / revenueUSD) * 100 : null

  // Per-user AI cost this month
  const perUserAiCost = await prisma.aiClassificationLog.groupBy({
    by: ['userId', 'callType'],
    where: { usedDefaultKey: true, createdAt: { gte: monthStart } },
    _count: { _all: true },
  })
  const userCostMap: Record<string, number> = {}
  for (const row of perUserAiCost) {
    const cost = (COST_PER_CALL_USD[row.callType as keyof typeof COST_PER_CALL_USD]
      ?? COST_PER_CALL_USD.default) * row._count._all
    userCostMap[row.userId] = (userCostMap[row.userId] ?? 0) + cost
  }

  // Per-user revenue from captured payments
  const userRevenueMap: Record<string, number> = {}
  for (const p of payments) {
    const usd = p.currency === 'INR' ? p.amountCents / 83 / 100 : p.amountCents / 100
    userRevenueMap[p.userId] = (userRevenueMap[p.userId] ?? 0) + usd
  }

  // Combine for per-user gross margin (only for users with any cost or revenue)
  const allUserIds = new Set([...Object.keys(userCostMap), ...Object.keys(userRevenueMap)])
  const perUserMargin = await Promise.all(
    [...allUserIds].map(async (uid) => {
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, email: true, name: true, planType: true },
      })
      const cost = userCostMap[uid] ?? 0
      const revenue = userRevenueMap[uid] ?? 0
      const margin = revenue - cost
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : null
      return { userId: uid, email: user?.email, name: user?.name, planType: user?.planType, cost, revenue, margin, marginPct }
    })
  )

  // Flag users with negative margin or margin < 50%
  const flaggedUsers = perUserMargin.filter(u => u.marginPct === null || u.marginPct < 50)

  return NextResponse.json({
    totalUsers,
    byTier,
    revenueThisMonthUSD: Math.round(revenueUSD * 100) / 100,
    estimatedMRR,
    totalAiCostUSD: Math.round(totalAiCostUSD * 10000) / 10000,
    totalAiCalls,
    grossMarginUSD: Math.round(grossMarginUSD * 100) / 100,
    grossMarginPct: grossMarginPct !== null ? Math.round(grossMarginPct * 10) / 10 : null,
    perUserMargin: perUserMargin.map(u => ({
      ...u,
      cost: Math.round(u.cost * 10000) / 10000,
      revenue: Math.round(u.revenue * 100) / 100,
      margin: Math.round(u.margin * 100) / 100,
      marginPct: u.marginPct !== null ? Math.round(u.marginPct * 10) / 10 : null,
      flag: u.marginPct === null ? 'no_revenue' : u.marginPct < 0 ? 'negative' : u.marginPct < 50 ? 'low' : null,
    })),
    flaggedUsers: flaggedUsers.length,
    monthStart: monthStart.toISOString(),
  })
}
