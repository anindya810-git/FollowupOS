import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const items = await prisma.scheduledMessage.findMany({
    where: { userId: session.user.id, status: 'pending' },
    orderBy: { scheduledFor: 'asc' },
  })
  return NextResponse.json({ items })
}
