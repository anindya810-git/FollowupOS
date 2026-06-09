'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import { LogoLockup } from '@/components/ui/Logo'
import { PendinglyLoader, PendinglyLoaderPage } from '@/components/ui/PendinglyLoader'

const FETCH_MESSAGES = [
  'Connecting to your inbox…',
  'Paging through recent emails…',
  'Reading your conversations…',
  'Almost done fetching…',
]

const STEPS = [
  'Connecting inbox',
  'Fetching recent threads',
  'Filtering noise',
  'Detecting follow-ups',
  'Building action queue',
]

interface ScanInfo {
  windowDays: number
  maxThreads: number
  planType: string
}

// A large first scan on the shared key can outlast a single serverless
// execution. If progress stalls this long, nudge a resume (the scanner skips
// already-processed threads, so it continues where it left off).
const STALL_MS = 90_000
const MAX_STALLED_RESUMES = 8

function ScanProgress() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = searchParams.get('jobId')
  const [status, setStatus] = useState('queued')
  const [progress, setProgress] = useState({ found: 0, processed: 0, created: 0 })
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null)
  const [fetchMsgIdx, setFetchMsgIdx] = useState(0)
  const prevStepRef = useRef(0)
  const completedRef = useRef(false)
  const scanTriggeredRef = useRef(false)
  const processedRef = useRef(0)
  const lastProgressAtRef = useRef(0)
  const stalledResumesRef = useRef(0)

  const triggerScan = useCallback(async () => {
    if (!jobId) return

    // Fetch plan info and connected account in parallel
    const [planData, integData] = await Promise.all([
      fetch('/api/plan').then(r => r.json()).catch(() => ({})),
      fetch('/api/integrations').then(r => r.json()).catch(() => ({ accounts: [] })),
    ])

    const windowDays: number = planData.scanWindowDays ?? 7
    const maxThreads: number = planData.maxThreadsPerScan ?? 75
    const planType: string = planData.type || 'free'
    setScanInfo({ windowDays, maxThreads, planType })

    const account = integData.accounts?.find((a: { connectedStatus: string }) => a.connectedStatus === 'connected')
    if (account) {
      await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id, scan_window_days: windowDays }),
      }).catch(() => {})
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) {
      router.push('/connect')
      return
    }

    if (!scanTriggeredRef.current) {
      scanTriggeredRef.current = true
      lastProgressAtRef.current = Date.now()
      triggerScan()
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/status/${jobId}`)
        const data = await res.json()
        setStatus(data.status)
        const processed = data.threads_processed || 0
        setProgress({ found: data.threads_found || 0, processed, created: data.action_items_created || 0 })

        // Track liveness for stall detection.
        if (processed > processedRef.current) {
          processedRef.current = processed
          lastProgressAtRef.current = Date.now()
          stalledResumesRef.current = 0
        }

        if (data.status === 'running' || data.status === 'queued') {
          const pct = data.threads_found > 0 ? data.threads_processed / data.threads_found : 0
          setCurrentStep(Math.min(Math.floor(pct * 3) + 1, 4))

          // Auto-resume if the background job died mid-scan (no progress for a while).
          if (Date.now() - lastProgressAtRef.current > STALL_MS) {
            if (stalledResumesRef.current < MAX_STALLED_RESUMES) {
              stalledResumesRef.current++
              lastProgressAtRef.current = Date.now()
              triggerScan()
            } else {
              setError('The scan stalled. You can resume it any time from Settings → Connected Inboxes.')
              clearInterval(interval)
            }
          }
        }

        if (data.status === 'completed') {
          setCurrentStep(5)
          clearInterval(interval)
          setTimeout(() => router.push('/dashboard'), 1800)
        }

        if (data.status === 'failed') {
          setError(data.error || 'Scan failed')
          clearInterval(interval)
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, router, triggerScan])

  // Soft chime as steps advance.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (currentStep > prevStepRef.current && currentStep < STEPS.length) {
      import('@/lib/sounds').then(({ playChime }) => playChime('info'))
    }
    prevStepRef.current = currentStep
  }, [currentStep])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'completed' && !completedRef.current) {
      completedRef.current = true
      import('@/lib/sounds').then(({ playChime }) => playChime('done'))
    }
  }, [status])

  // Cycle through reassuring messages while fetching threads
  const isFetching = status !== 'completed' && currentStep <= 1 && !error
  useEffect(() => {
    if (!isFetching) return
    const t = setInterval(() => setFetchMsgIdx(i => (i + 1) % FETCH_MESSAGES.length), 3000)
    return () => clearInterval(t)
  }, [isFetching])

  const isPaid = scanInfo && scanInfo.planType !== 'free'

  // Smooth overall percentage. Completed steps count fully; the active step
  // contributes its real thread progress (or ~50% while indeterminate).
  const overallPct = status === 'completed'
    ? 100
    : (() => {
        const per = 100 / STEPS.length
        let pct = currentStep * per
        if (currentStep === 3 && progress.found > 0) {
          pct += (progress.processed / progress.found) * per
        } else {
          pct += per * 0.5
        }
        return Math.min(99, Math.round(pct))
      })()

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex flex-col items-center gap-3 mb-8">
          {status === 'completed' ? (
            <LogoLockup size="lg" />
          ) : (
            <>
              <PendinglyLoader size={56} variant="light" />
              <span className="text-lg font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
            </>
          )}
        </div>

        <h1 className="text-2xl font-bold text-ink mb-2">Building your action queue</h1>

        {scanInfo && status !== 'completed' && (
          <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-[rgb(11_18_32/5%)] border border-[rgb(11_18_32/8%)]">
            <span className="text-[11px] font-medium text-[rgb(11_18_32/55%)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {scanInfo.windowDays}-day scan · up to {scanInfo.maxThreads} threads
            </span>
            {isPaid && (
              <span className="text-[10px] font-semibold text-[rgb(11_18_32/45%)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                {scanInfo.planType}
              </span>
            )}
          </div>
        )}

        <div className="mb-7 min-h-[2.5rem] flex flex-col items-center justify-center gap-1">
          {status === 'completed' ? (
            <p className="text-sm text-[rgb(11_18_32/55%)]">
              Done — found {progress.created} action item{progress.created !== 1 ? 's' : ''}. Heading to your dashboard…
            </p>
          ) : progress.found > 0 && progress.created > 0 ? (
            <p className="text-sm text-[rgb(11_18_32/55%)]">Analyzed {progress.processed} of {progress.found} threads · {progress.created} found so far</p>
          ) : progress.found > 0 ? (
            <>
              <p className="text-sm text-[rgb(11_18_32/55%)]">Analyzing {progress.found} threads for follow-ups</p>
              {isFetching && <p className="text-xs text-[rgb(11_18_32/35%)] transition-opacity duration-500">{FETCH_MESSAGES[fetchMsgIdx]}</p>}
            </>
          ) : isFetching ? (
            <>
              <p className="text-sm text-[rgb(11_18_32/55%)]">{scanInfo ? `Scanning your last ${scanInfo.windowDays} days of email` : 'Scanning your email'}</p>
              <p className="text-xs text-[rgb(11_18_32/35%)] transition-opacity duration-500">{FETCH_MESSAGES[fetchMsgIdx]}</p>
            </>
          ) : (
            <p className="text-sm text-[rgb(11_18_32/55%)]">{scanInfo ? `Scanning your last ${scanInfo.windowDays} days of email` : 'Scanning your email'}</p>
          )}
        </div>

        {error ? (
          <div className="text-sm text-action bg-[rgb(242_90_60/6%)] rounded-xl p-4 border border-[rgb(242_90_60/18%)]">{error}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-rule p-6 shadow-sm text-left">
            {/* Overall progress bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ink">
                  {status === 'completed' ? 'Complete' : STEPS[Math.min(currentStep, STEPS.length - 1)]}
                  {isFetching && progress.found > 0 && (
                    <span className="ml-1.5 font-normal text-[rgb(11_18_32/45%)]">· {progress.found} threads found</span>
                  )}
                </span>
                {!isFetching && (
                  <span className="text-xs font-medium text-[rgb(11_18_32/45%)]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {overallPct}%
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-[rgb(11_18_32/7%)] overflow-hidden">
                {isFetching ? (
                  <div className="h-full w-full rounded-full animate-shimmer" />
                ) : (
                  <div
                    className="h-full rounded-full bg-ink transition-all duration-700 ease-out"
                    style={{ width: `${overallPct}%` }}
                  />
                )}
              </div>
            </div>

            {/* Step checklist — green when done, a quiet spinner when active */}
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const isDone = status === 'completed' || i < currentStep
                const isActive = !isDone && i === currentStep
                return (
                  <div key={step} className="flex items-center gap-3">
                    {isDone ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(26_143_94/12%)]">
                        <Check className="h-3 w-3 text-done" />
                      </span>
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 shrink-0 text-[rgb(11_18_32/45%)] animate-spin" />
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[rgb(11_18_32/10%)]" />
                    )}
                    <span className={`text-sm ${isDone ? 'text-[rgb(11_18_32/55%)]' : isActive ? 'text-ink font-medium' : 'text-[rgb(11_18_32/30%)]'}`}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!error && scanInfo && status !== 'completed' && (
          <p className="mt-4 text-[11px] text-[rgb(11_18_32/30%)]" style={{ fontFamily: 'var(--font-mono)' }}>
            First-time scan only — future syncs are incremental (new emails only)
          </p>
        )}
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<PendinglyLoaderPage label="Scanning your inbox…" sublabel="Building your action queue." />}>
      <ScanProgress />
    </Suspense>
  )
}
