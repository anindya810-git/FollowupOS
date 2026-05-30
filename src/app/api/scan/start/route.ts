import { NextRequest, NextResponse } from 'next/server'
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

  const account = await prisma.emailAccount.findFirst({
    where: { id: account_id, userId: session.user.id, connectedStatus: 'connected' },
  })
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Resolve plan and its limits — these are authoritative; client-provided
  // scan_window_days is ignored to prevent users from scanning more than their plan allows.
  const plan = await getUserPlan(session.user.id)
  const limits = PLAN_LIMITS[plan.type]

  // First scan: use the full plan look-back window (3 days free / 7 days lite / 30 days pro).
  // Subsequent syncs: only look at the last 7 days for Outlook/IMAP (Gmail uses
  // the incremental History API and ignores this window entirely).
  const isFirstScan = !account.initialScanCompleted
  const scan_window_days = isFirstScan ? limits.scanWindowDays : 7
  const max_threads = limits.maxThreadsPerScan === -1 ? undefined : limits.maxThreadsPerScan

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

  // INCREMENTAL SYNC: do NOT clear gmailHistoryId or thread hashes.
  //
  // Gmail:  the scanner keeps the stored historyId and uses Gmail's History API
  //         to fetch only threads that have had new messages since the last scan.
  //         This means re-syncing is instant when there are no new emails.
  //
  // Outlook/IMAP: thread hashes are preserved so unchanged threads are skipped
  //               in O(1) without re-calling the AI.
  //
  // If you need to force a full re-classification (e.g. after changing AI settings),
  // pass force_full_rescan: true in the request body.
  const force_full_rescan = body.force_full_rescan === true
  if (force_full_rescan) {
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { gmailHistoryId: null },
    })
    await prisma.emailThread.updateMany({
      where: { emailAccountId: account.id },
      data: { threadHash: null },
    })
  }

  // Run the scan inline (awaited) rather than via `after()`.
  //
  // `after()` schedules work to run *after the response is flushed*, but on
  // serverless platforms the function instance can be frozen/reclaimed the
  // moment the response returns — so the background callback may never execute
  // and the job sits at "queued" forever. Running inline guarantees the scan
  // actually runs and the response carries the final status.
  //
  // The scan job row was already committed above, and the scanner updates its
  // progress counters in the DB per batch, so the client's 2 s polling shows
  // live progress (from concurrent /api/integrations requests) while this
  // request is still in flight. maxDuration=300 gives the scan room to finish.
  await triggerScan(scanJob.id, session.user.id, account.id, scan_window_days, max_threads)

  // Re-read the job so the caller gets the real terminal status/diagnostics.
  const finished = await prisma.scanJob.findUnique({
    where: { id: scanJob.id },
    select: { status: true, threadsFound: true, threadsProcessed: true, actionItemsCreated: true, errorMessage: true },
  })

  return NextResponse.json({
    job_id: scanJob.id,
    status: finished?.status ?? 'queued',
    threads_found: finished?.threadsFound ?? 0,
    threads_processed: finished?.threadsProcessed ?? 0,
    action_items_created: finished?.actionItemsCreated ?? 0,
    error_message: finished?.errorMessage ?? null,
    scan_window_days,
    max_threads: max_threads ?? null,
    is_first_scan: isFirstScan,
  })
}

async function triggerScan(jobId: string, userId: string, accountId: string, days: number, maxThreads?: number) {
  try {
    const { runInitialScan } = await import('@/lib/scanner')
    await runInitialScan(jobId, userId, accountId, days, maxThreads)
  } catch (error) {
    safeLog('error', 'scan-start', error)
  }
}
