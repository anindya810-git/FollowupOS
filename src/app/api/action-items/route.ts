import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') || 'open'
  const category = searchParams.get('category')
  const priority = searchParams.get('priority')
  const search = searchParams.get('search')
  const repeatedAsks = searchParams.get('repeated_asks')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Record<string, unknown> = {
    userId: session.user.id,
    status,
  }

  if (category) where.category = category
  if (priority) where.priority = priority
  if (repeatedAsks) where.repeatedAskCount = { gte: 2 }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { reason: { contains: search } },
      { ownerName: { contains: search } },
      { ownerEmail: { contains: search } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { lastActivityAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        emailThread: {
          select: {
            subject: true,
            providerUrl: true,
            lastMessageAt: true,
            participants: true,
          },
        },
      },
    }),
    prisma.actionItem.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}
