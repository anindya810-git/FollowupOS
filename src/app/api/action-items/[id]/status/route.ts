import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, snoozed_until, ignored_reason } = body

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { status }
  if (status === 'done') updateData.completedAt = new Date()
  if (status === 'snoozed' && snoozed_until) updateData.snoozedUntil = snoozed_until
  if (status === 'ignored' && ignored_reason) updateData.ignoredReason = ignored_reason

  const updated = await prisma.actionItem.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ item: updated })
}
