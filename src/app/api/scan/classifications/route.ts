import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await prisma.aiClassificationLog.findMany({
    where: { userId: session.user.id, callType: 'classify' },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      emailThread: { select: { subject: true, lastMessageFromUser: true } },
    },
  })

  return NextResponse.json(logs.map(l => ({
    subject: l.emailThread?.subject ?? '(unknown)',
    lastMessageFromUser: l.emailThread?.lastMessageFromUser,
    result: l.outputJson ? JSON.parse(l.outputJson) : null,
    error: l.errorMessage,
    createdAt: l.createdAt,
  })))
}
