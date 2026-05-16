import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { ids?: string[]; action?: string; snoozed_until?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.ids?.length || !body.action) {
    return NextResponse.json({ error: 'Missing ids or action' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.action === 'done') {
    data.status = 'done'
    data.completedAt = new Date()
  } else if (body.action === 'snoozed' && body.snoozed_until) {
    data.status = 'snoozed'
    data.snoozedUntil = body.snoozed_until
  } else if (body.action === 'ignored') {
    data.status = 'ignored'
  } else if (body.action === 'open') {
    data.status = 'open'
    data.completedAt = null
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const result = await prisma.actionItem.updateMany({
    where: { id: { in: body.ids }, userId: session.user.id },
    data,
  })

  return NextResponse.json({ updated: result.count })
}
