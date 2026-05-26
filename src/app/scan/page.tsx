'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import { LogoLockup } from '@/components/ui/Logo'
import { PendinglyLoader, PendinglyLoaderPage } from '@/components/ui/PendinglyLoader'

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

function ScanProgress() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = searchParams.get('jobId')
  const [status, setStatus] = useState('queued')
  const [progress, setProgress] = useState({ found: 0, processed: 0, created: 0 })
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null)
  const prevStepRef = useRef(0)
  const completedRef = useRef(false)
  const scanTriggeredRef = useRef(false)

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
      })
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) {
      router.push('/connect')
      return
    }

    // Trigger scan once (plan fetch + scan start)
    if (!scanTriggeredRef.current) {
      scanTriggeredRef.current = true
      triggerScan()
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/status/${jobId}`)
        const data = await res.json()
        setStatus(data.status)
        setProgress({
          found: data.threads_found || 0,
          processed: data.threads_processed || 0,
          created: data.action_items_created || 0,
        })

        if (data.status === 'running') {
          const pct = data.threads_found > 0 ? data.threads_processed / data.threads_found : 0
          setCurrentStep(Math.min(Math.floor(pct * 3) + 1, 4))
        }

        if (data.status === 'completed') {
          setCurrentStep(5)
          clearInterval(interval)
          setTimeout(() => router.push('/dashboard'), 2000)
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

  // Play chime when a new step completes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (currentStep > prevStepRef.current && currentStep < STEPS.length) {
      import('@/lib/sounds').then(({ playChime }) => playChime('info'))
    }
    prevStepRef.current = currentStep
  }, [currentStep])

  // Play done chime when all steps complete
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'completed' && !completedRef.current) {
      completedRef.current = true
      import('@/lib/sounds').then(({ playChime }) => playChime('done'))
    }
  }, [status])

  const isPaid = scanInfo && scanInfo.planType !== 'free'

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex flex-col items-center gap-3 mb-8">
          {status === 'completed' ? (
            <LogoLockup size="lg" />
          ) : (
            <>
              <PendinglyLoader size={64} variant="light" />
              <span className="text-xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
            </>
          )}
        </div>

        <h1 className="text-2xl font-bold text-ink mb-2">Building your action queue</h1>

        {/* Scan scope badge — shown once we know the plan */}
        {scanInfo && status !== 'completed' && (
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-[rgb(11_18_32/6%)] border border-[rgb(11_18_32/8%)]">
            <span className="text-[11px] font-medium text-[rgb(11_18_32/55%)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {scanInfo.windowDays}-day scan · up to {scanInfo.maxThreads} threads
            </span>
            {isPaid && (
              <span className="text-[10px] font-semibold text-action uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                {scanInfo.planType}
              </span>
            )}
          </div>
        )}

        <p className="text-[rgb(11_18_32/55%)] mb-8">
          {status === 'completed'
            ? `Done! Found ${progress.created} action item${progress.created !== 1 ? 's' : ''} — heading to your dashboard…`
            : progress.found > 0 && progress.created > 0
            ? `Analyzed ${progress.processed} of ${progress.found} threads — ${progress.created} action item${progress.created !== 1 ? 's' : ''} found so far...`
            : progress.found > 0
            ? `Analyzing ${progress.found} threads for follow-ups...`
            : scanInfo
            ? `Scanning your last ${scanInfo.windowDays} days of email...`
            : 'Scanning your email...'}
        </p>

        {error ? (
          <div className="text-action bg-[rgb(242_90_60/8%)] rounded-lg p-4 border border-[rgb(242_90_60/20%)]">{error}</div>
        ) : (
          <div className="bg-white rounded-xl border border-rule p-6">
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  {i < currentStep ? (
                    <CheckCircle className="h-5 w-5 text-action flex-shrink-0" />
                  ) : i === currentStep ? (
                    <Loader2 className="h-5 w-5 text-action animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-rule flex-shrink-0" />
                  )}
                  <span className={`text-sm ${i <= currentStep ? 'text-ink font-medium' : 'text-[rgb(11_18_32/30%)]'}`}>
                    {step}
                  </span>
                </div>
              ))}
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
