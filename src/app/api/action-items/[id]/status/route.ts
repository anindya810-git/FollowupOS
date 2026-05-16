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
  let body: { status?: unknown; snoozed_until?: unknown; ignored_reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ALLOWED = ['open', 'done', 'snoozed', 'ignored'] as const
  type Status = (typeof ALLOWED)[number]
  const status = body.status
  if (typeof status !== 'string' || !(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const typedStatus = status as Status

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { status: typedStatus }
  if (typedStatus === 'done') updateData.completedAt = new Date()
  if (typedStatus === 'open') updateData.completedAt = null
  if (typedStatus === 'snoozed' && typeof body.snoozed_until === 'string') {
    updateData.snoozedUntil = body.snoozed_until
  }
  if (typedStatus === 'ignored' && typeof body.ignored_reason === 'string') {
    updateData.ignoredReason = body.ignored_reason
  }

  // Scope update by both id AND userId — defence in depth against any
  // race between the findFirst above and the update.
  const result = await prisma.actionItem.updateMany({
    where: { id, userId: session.user.id },
    data: updateData,
  })
  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = await prisma.actionItem.findUnique({ where: { id } })
  return NextResponse.json({ item: updated })
}
