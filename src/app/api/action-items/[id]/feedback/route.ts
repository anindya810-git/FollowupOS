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

  await prisma.userFeedback.create({
    data: {
      userId: session.user.id,
      actionItemId: id,
      feedbackType: body.feedback_type,
      feedbackValue: body.feedback_value,
    },
  })

  return NextResponse.json({ success: true })
}
