import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emailThread: {
        include: {
          emailAccount: { select: { provider: true } },
          messages: {
            orderBy: { sentAt: 'asc' },
            take: 10,
            select: {
              senderEmail: true,
              senderName: true,
              snippet: true,
              bodyExcerpt: true,
              sentAt: true,
              isFromUser: true,
              linksJson: true,
              attachmentsJson: true,
            },
          },
        },
      },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ item })
}
