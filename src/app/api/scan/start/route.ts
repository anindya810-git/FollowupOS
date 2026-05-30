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

  // Use an explicit select so adding new columns to the EmailAccount schema
  // in the future does NOT break this route before the DB migration is applied.
  // Without select, Prisma generates SELECT * (all columns) — if a new column
  // exists in the schema but not the DB, the query throws and no scan job is
  // ever created.
  const account = await prisma.emailAccount.findFirst({
    where: { id: account_id, userId: session.user.id, connectedStatus: 'connected' },
    select: {
      id: true,
      provider: true,
      emailAddress: true,
      initialScanCompleted: true,
      gmailHistoryId: true,
    },
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

  // Idempotency + auto-resume: if a scan is already queued/running for this
  // account, decide based on how recently it made progress (updatedAt bumps
  // every batch via the debug log). A large first scan on the shared key can't
  // finish in one serverless execution, so when the function dies the job is
  // left RUNNING. Rather than getting stuck, we RESUME the same job — the
  // scanner skips already-processed threads (thread hash), so it picks up where
  // it left off and finishes across a few executions driven by the poller.
  const existing = await prisma.scanJob.findFirst({
    where: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: { in: ['queued', 'running'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, updatedAt: true },
  })
  if (existing) {
    const sinceProgressMs = Date.now() - existing.updatedAt.getTime()
    // Fresh progress within the last 90s → genuinely alive; don't double-run.
    if (sinceProgressMs < 90_000) {
      return NextResponse.json({ job_id: existing.id, status: existing.status, reused: true })
    }
    // Stalled → claim it (bump updatedAt so concurrent polls don't also resume)
    // and re-trigger the scan on the SAME job to continue.
    await prisma.scanJob.update({
      where: { id: existing.id },
      data: { status: 'running', updatedAt: new Date() },
    })
    after(triggerScan(existing.id, session.user.id, account.id, scan_window_days, max_threads))
    return NextResponse.json({ job_id: existing.id, status: 'running', resumed: true })
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

  // Run the scan in the BACKGROUND via `after()` and return 200 immediately.
  //
  // We deliberately do NOT await the scan inline: a full scan with the
  // free-tier Gemini key spaces calls ~4.2 s apart, so even a dozen threads
  // can exceed Vercel's function timeout (60 s on Hobby). Blocking the HTTP
  // response on the scan caused the request to be killed mid-flight, which the
  // client saw as "Sync failed" even though the scan was progressing fine.
  //
  // `after()` lets Vercel flush the 200 response first, then keep the instance
  // alive to run the scan (subject to maxDuration). The scan job row is already
  // committed and the scanner writes progress + step logs to the DB per batch,
  // so the client's 2 s polling of /api/integrations shows live progress and
  // the Scan Logs page shows the full trace — without ever erroring the button.
  after(triggerScan(scanJob.id, session.user.id, account.id, scan_window_days, max_threads))

  return NextResponse.json({
    job_id: scanJob.id,
    status: 'queued',
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
