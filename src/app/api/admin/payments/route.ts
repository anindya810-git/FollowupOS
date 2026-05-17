import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 50
  const skip = (page - 1) * limit

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true, planType: true } },
      },
    }),
    prisma.payment.count(),
  ])

  return NextResponse.json({ payments, total, page, pages: Math.ceil(total / limit) })
}

// Admin can manually record a payment (for offline/bank transfer)
export async function POST(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    userId: string
    amountCents: number
    currency?: string
    provider: string
    planType: string
    planDays?: number
    notes?: string
  }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.userId || !body.amountCents || !body.provider || !body.planType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const payment = await prisma.payment.create({
    data: {
      userId: body.userId,
      amountCents: body.amountCents,
      currency: body.currency ?? 'INR',
      provider: body.provider,
      status: 'captured',
      planType: body.planType,
      planDays: body.planDays ?? 30,
      notes: body.notes,
    },
  })

  // Also update the user's plan
  const days = body.planDays ?? 30
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await prisma.user.update({
    where: { id: body.userId },
    data: {
      planType: body.planType,
      planExpiresAt: expiresAt,
    },
  })

  return NextResponse.json({ ok: true, payment })
}
