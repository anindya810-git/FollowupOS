import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const watchList = await prisma.watchList.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ watchList })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sender_email?: unknown; domain?: unknown; thread_id?: unknown; label?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const sender_email = typeof body.sender_email === 'string' ? body.sender_email.trim().toLowerCase() : null
  const domain = typeof body.domain === 'string' ? body.domain.trim().toLowerCase().replace(/^@/, '') : null
  const thread_id = typeof body.thread_id === 'string' ? body.thread_id : null
  const label = typeof body.label === 'string' ? body.label.slice(0, 200) : null

  if (!sender_email && !domain && !thread_id) {
    return NextResponse.json({ error: 'sender_email, domain, or thread_id required' }, { status: 400 })
  }

  // Avoid duplicates — if an identical entry already exists, return it.
  const existing = await prisma.watchList.findFirst({
    where: {
      userId: session.user.id,
      senderEmail: sender_email,
      domain,
      threadId: thread_id,
    },
  })
  if (existing) {
    return NextResponse.json({ record: existing, duplicate: true })
  }

  const record = await prisma.watchList.create({
    data: {
      userId: session.user.id,
      senderEmail: sender_email,
      domain,
      threadId: thread_id,
      label,
    },
  })

  return NextResponse.json({ record })
}
