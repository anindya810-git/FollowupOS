import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const result = await prisma.scheduledMessage.updateMany({
    where: { id, userId: session.user.id, status: 'pending' },
    data: { status: 'cancelled' },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found or already sent' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
