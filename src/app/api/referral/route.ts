import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — return the current user's referral code + stats
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const referrals = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    select: { daysAwarded: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const totalDaysEarned = referrals.reduce((sum, r) => sum + r.daysAwarded, 0)

  return NextResponse.json({
    referralCode: user.referralCode,
    referralUrl: `${process.env.APP_BASE_URL}/r/${user.referralCode}`,
    totalReferrals: referrals.length,
    totalDaysEarned,
    referrals,
  })
}
