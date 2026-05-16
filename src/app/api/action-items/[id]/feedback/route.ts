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
  let body: { feedback_type?: unknown; feedback_value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.feedback_type !== 'string' || !body.feedback_type) {
    return NextResponse.json({ error: 'feedback_type required' }, { status: 400 })
  }

  // Validate the action item belongs to this user before recording feedback
  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.userFeedback.create({
    data: {
      userId: session.user.id,
      actionItemId: id,
      feedbackType: body.feedback_type,
      feedbackValue: typeof body.feedback_value === 'string' ? body.feedback_value : null,
    },
  })

  return NextResponse.json({ success: true })
}
