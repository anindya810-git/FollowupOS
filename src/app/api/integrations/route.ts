import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      emailAddress: true,
      connectedStatus: true,
      lastSyncedAt: true,
      initialScanCompleted: true,
      webmailBaseUrl: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ accounts })
}
