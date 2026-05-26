'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import { LogoLockup } from '@/components/ui/Logo'
import { PendinglyLoader, PendinglyLoaderPage } from '@/components/ui/PendinglyLoader'

const STEPS = [
  'Connecting Gmail',
  'Fetching recent threads',
  'Filtering noise',
  'Detecting follow-ups',
  'Building action queue',
]

function ScanProgress() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = searchParams.get('jobId')
  const [status, setStatus] = useState('queued')
  const [progress, setProgress] = useState({ found: 0, processed: 0, created: 0 })
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const prevStepRef = useRef(0)
  const completedRef = useRef(false)

  const triggerScan = useCallback(async () => {
    if (!jobId) return
    // Get email account and trigger scan
    const res = await fetch('/api/integrations')
    const data = await res.json()
    const account = data.accounts?.find((a: { connectedStatus: string }) => a.connectedStatus === 'connected')
    if (account) {
      await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id, scan_window_days: 14, max_threads: 12 }),
      })
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) {
      router.push('/connect')
      return
    }

    // Trigger scan
    triggerScan()

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
        <p className="text-[rgb(11_18_32/55%)] mb-8">
          {status === 'completed'
            ? `Done! Found ${progress.created} action item${progress.created !== 1 ? 's' : ''} — heading to your dashboard…`
            : progress.found > 0 && progress.created > 0
            ? `Analyzed ${progress.processed} of ${progress.found} threads — ${progress.created} action item${progress.created !== 1 ? 's' : ''} found so far...`
            : progress.found > 0
            ? `Analyzing ${progress.found} threads for follow-ups...`
            : 'Quick scan — checking your 12 most recent threads…'}
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
            {status !== 'completed' && (
              <p className="text-[11px] text-[rgb(11_18_32/35%)] mt-5 pt-4 border-t border-rule">
                Quick scan · 12 threads · ~50 seconds. Run a full scan any time from Settings.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<PendinglyLoaderPage label="Scanning your inbox…" sublabel="Reading the last 14 days. Building your queue." />}>
      <ScanProgress />
    </Suspense>
  )
}
