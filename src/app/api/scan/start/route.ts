import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeLog } from '@/lib/safe-log'
import { getUserPlan, PLAN_LIMITS } from '@/lib/plan'

// Tell Vercel to allow up to 300 s for this function (Pro plan).
// Hobby is capped at 60 s by Vercel regardless of this setting.
export const maxDuration = 300

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
  const requested_days = typeof body.scan_window_days === 'number' ? body.scan_window_days : 30

  // Cap by plan: free=3d, lite=7d, pro=unlimited (use whatever the user asked for)
  const plan = await getUserPlan(session.user.id)
  const planCap = PLAN_LIMITS[plan.type].scanWindowDays
  const scan_window_days = planCap === -1 ? requested_days : Math.min(requested_days, planCap)

  const account = await prisma.emailAccount.findFirst({
    where: { id: account_id, userId: session.user.id, connectedStatus: 'connected' },
  })
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Idempotency: if a scan is already queued or running for this account,
  // return that job — UNLESS it's been stuck for >15 minutes (Vercel killed it),
  // in which case mark it failed and let a new one start.
  const existing = await prisma.scanJob.findFirst({
    where: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: { in: ['queued', 'running'] },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    const ageMs = Date.now() - existing.createdAt.getTime()
    const stale = ageMs > 15 * 60 * 1000
    if (!stale) {
      return NextResponse.json({ job_id: existing.id, status: existing.status, reused: true })
    }
    // Mark stale job failed so we can start a fresh scan
    await prisma.scanJob.update({
      where: { id: existing.id },
      data: { status: 'failed', errorMessage: 'Scan timed out — restarting.' },
    })
  }

  const scanJob = await prisma.scanJob.create({
    data: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: 'queued',
    },
  })

  // Schedule scan to run after the response is sent.
  // `after()` tells Vercel to keep the function alive until the promise resolves
  // (up to maxDuration above), so the scan isn't killed when the HTTP response returns.
  after(triggerScan(scanJob.id, session.user.id, account.id, scan_window_days))

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
