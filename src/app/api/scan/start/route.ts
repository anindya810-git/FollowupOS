import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { account_id, scan_window_days = 30 } = body

  const account = await prisma.emailAccount.findFirst({
    where: { id: account_id, userId: session.user.id, connectedStatus: 'connected' },
  })
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
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
    console.error('Scan error:', error)
  }
}
