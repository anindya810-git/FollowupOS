import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sender_email?: unknown; domain?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const sender_email = typeof body.sender_email === 'string' ? body.sender_email : null
  const domain = typeof body.domain === 'string' ? body.domain : null
  const reason = typeof body.reason === 'string' ? body.reason : null

  if (!sender_email && !domain) {
    return NextResponse.json({ error: 'sender_email or domain required' }, { status: 400 })
  }

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
