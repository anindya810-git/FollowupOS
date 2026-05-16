'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import { LogoLockup } from '@/components/ui/Logo'

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
        body: JSON.stringify({ account_id: account.id, scan_window_days: 30 }),
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
        <div className="flex items-center justify-center mb-8">
          <LogoLockup size="lg" />
        </div>

        <h1 className="text-2xl font-bold text-ink mb-2">Building your action queue</h1>
        <p className="text-[rgb(11_18_32/55%)] mb-8">
          {progress.found > 0
            ? `Analyzing ${progress.found} threads, found ${progress.created} action items so far...`
            : 'Scanning your Gmail inbox...'}
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
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-action" /></div>}>
      <ScanProgress />
    </Suspense>
  )
}
