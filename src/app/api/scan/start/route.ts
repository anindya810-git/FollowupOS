import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeLog } from '@/lib/safe-log'

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
  const scan_window_days = typeof body.scan_window_days === 'number' ? body.scan_window_days : 30

  const account = await prisma.emailAccount.findFirst({
    where: { id: account_id, userId: session.user.id, connectedStatus: 'connected' },
  })
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Idempotency: if a scan is already queued or running for this account,
  // return that job instead of spinning another one. Prevents the /scan
  // page from creating duplicate jobs on refresh.
  const existing = await prisma.scanJob.findFirst({
    where: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: { in: ['queued', 'running'] },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    return NextResponse.json({ job_id: existing.id, status: existing.status, reused: true })
  }

  const scanJob = await prisma.scanJob.create({
    data: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: 'queued',
    },
  })

  // Trigger scan asynchronously
  triggerScan(scanJob.id, session.user.id, account.id, scan_window_days)

  return NextResponse.json({ job_id: scanJob.id, status: 'queued' })
}

async function triggerScan(jobId: string, userId: string, accountId: string, days: number) {
  try {
    const { runInitialScan } = await import('@/lib/scanner')
    await runInitialScan(jobId, userId, accountId, days)
  } catch (error) {
    safeLog('error', 'scan-start', error)
  }
}
