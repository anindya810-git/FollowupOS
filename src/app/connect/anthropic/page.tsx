'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LogoMark } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ExternalLink, ShieldCheck } from 'lucide-react'

function AnthropicKeyStep() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ hasKey: boolean; hasEnvFallback: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/user/anthropic-key')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStatus(d) })
      .catch(() => {})
  }, [])

  const next = () => {
    if (jobId) router.push(`/scan?jobId=${jobId}`)
    else router.push('/dashboard')
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/anthropic-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save')
      }
      next()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const alreadyHasKey = status?.hasKey || status?.hasEnvFallback

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)] flex items-center gap-2">
        <LogoMark className="h-5 w-6 flex-shrink-0" />
        <span className="text-sm font-semibold tracking-widest uppercase text-ink">Pendingly</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(11_18_32/30%)] mb-4">
            Step 2 of 3
          </p>
          <h1 className="text-3xl font-bold text-ink mb-2">Add your Anthropic API key</h1>
          <p className="text-[rgb(11_18_32/55%)] mb-6">
            Pendingly uses Claude to read your threads and decide what needs your attention.
            You bring your own key — we never touch your billing.
          </p>

          {alreadyHasKey && (
            <div className="flex items-start gap-2.5 bg-[rgb(26_143_94/8%)] border border-[rgb(26_143_94/25%)] rounded-lg p-3.5 mb-5">
              <ShieldCheck className="h-4 w-4 text-done flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-done">
                  {status?.hasKey ? 'A key is already saved on your account' : 'A server-side key is configured'}
                </p>
                <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                  You can continue, or replace it below.
                </p>
              </div>
            </div>
          )}

          <label className="block text-xs font-medium text-ink mb-1.5">Anthropic API key</label>
          <Input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {error && <p className="text-xs text-action mt-2">{error}</p>}

          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[rgb(11_18_32/55%)] hover:text-ink mt-3 transition-colors"
          >
            Get a key at console.anthropic.com
            <ExternalLink className="h-3 w-3" />
          </a>

          <div className="flex items-center gap-2 mt-6">
            <Button onClick={save} disabled={saving || !apiKey.trim()} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & continue'}
            </Button>
            <Button variant="outline" onClick={next} disabled={saving}>
              Skip for now
            </Button>
          </div>

          <div className="mt-8 space-y-2 border-t border-[rgb(11_18_32/8%)] pt-6">
            {[
              'Stored encrypted at rest — only Pendingly calls Claude with it',
              'No scan or AI features work without a key (your inbox stays empty)',
              'Costs about $0.20–$0.50 per inbox scan, then near-zero day-to-day',
              'You can add, replace, or remove the key in Settings anytime',
            ].map(text => (
              <p key={text} className="text-xs text-[rgb(11_18_32/55%)] flex items-start gap-2">
                <span className="mt-0.5 text-action">·</span>
                {text}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AnthropicKeyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-action" />
      </div>
    }>
      <AnthropicKeyStep />
    </Suspense>
  )
}
