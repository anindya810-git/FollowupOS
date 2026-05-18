import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const account_id = typeof body.account_id === 'string' ? body.account_id : undefined
  if (!account_id) {
    return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  }

  const account = await prisma.emailAccount.findFirst({
    where: { id: account_id, userId: session.user.id },
  })
  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.scanJob.updateMany({
    where: {
      emailAccountId: account_id,
      userId: session.user.id,
      status: { in: ['queued', 'running'] },
    },
    data: { status: 'failed', errorMessage: 'Cancelled by user.' },
  })

  return NextResponse.json({ cancelled: updated.count })
}
