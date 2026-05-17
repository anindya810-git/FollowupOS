import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addPlanDays } from '@/lib/plan'

// POST { code } — activate a referral code for the current user.
// Idempotent: silently succeeds if already activated.
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { code?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body.code !== 'string' || !body.code.trim()) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }
  const code = body.code.trim()

  // Already been referred?
  const existing = await prisma.referral.findUnique({
    where: { referredUserId: session.user.id },
  })
  if (existing) return NextResponse.json({ ok: true, alreadyActivated: true })

  // Find the referrer
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  })
  if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  if (referrer.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  // Credit the referrer with 30 days
  const DAYS = 30
  await prisma.referral.create({
    data: { referrerId: referrer.id, referredUserId: session.user.id, daysAwarded: DAYS },
  })
  await addPlanDays(referrer.id, DAYS)

  return NextResponse.json({ ok: true, daysAwarded: DAYS })
}
