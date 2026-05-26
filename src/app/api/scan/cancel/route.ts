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

  // Read jobs first so we can preserve any accumulated error info written
  // by the scanner during partial processing.
  const jobs = await prisma.scanJob.findMany({
    where: {
      emailAccountId: account_id,
      userId: session.user.id,
      status: { in: ['queued', 'running'] },
    },
    select: { id: true, errorMessage: true },
  })

  for (const job of jobs) {
    const cancelMsg = job.errorMessage
      ? `Cancelled by user. — ${job.errorMessage}`
      : 'Cancelled by user.'
    await prisma.scanJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: cancelMsg },
    })
  }

  return NextResponse.json({ cancelled: jobs.length })
}
