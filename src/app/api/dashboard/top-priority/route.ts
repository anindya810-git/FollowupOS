import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await prisma.actionItem.findMany({
    where: {
      userId: session.user.id,
      status: 'open',
      category: { not: 'no_action_needed' },
    },
    orderBy: [
      { priority: 'asc' },
      { lastActivityAt: 'desc' },
    ],
    take: 10,
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
  })

  return NextResponse.json({ items })
}
