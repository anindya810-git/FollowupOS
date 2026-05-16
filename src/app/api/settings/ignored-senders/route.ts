import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { sender_email, domain, reason } = body

  const record = await prisma.ignoredSender.create({
    data: {
      userId: session.user.id,
      senderEmail: sender_email,
      domain,
      reason,
    },
  })

  return NextResponse.json({ record })
}
