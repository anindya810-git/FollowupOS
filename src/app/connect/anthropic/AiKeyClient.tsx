'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LogoMark } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { PendinglyLoaderPage } from '@/components/ui/PendinglyLoader'
import { Input } from '@/components/ui/input'
import { Loader2, ExternalLink, ShieldCheck } from 'lucide-react'

type Provider = 'gemini' | 'anthropic' | 'openai'

const PROVIDERS: Array<{
  id: Provider; label: string; placeholder: string
  docsUrl: string; docsLabel: string; note: string
}> = [
  { id: 'gemini',    label: 'Google Gemini',       placeholder: 'AIza...',    docsUrl: 'https://aistudio.google.com/apikey',          docsLabel: 'Get a key at Google AI Studio',      note: 'Free tier available — recommended for getting started.' },
  { id: 'anthropic', label: 'Anthropic (Claude)',   placeholder: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys',  docsLabel: 'Get a key at console.anthropic.com', note: '~$0.20–0.50 per inbox scan.' },
  { id: 'openai',    label: 'OpenAI (GPT-4o mini)', placeholder: 'sk-...',     docsUrl: 'https://platform.openai.com/api-keys',         docsLabel: 'Get a key at platform.openai.com',   note: 'Very cost-effective per scan.' },
]

interface Props {
  initialHasAnyKey: boolean
  initialHasServerDefault: boolean
}

function AiKeyStep({ initialHasAnyKey, initialHasServerDefault }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')

  const [selectedProvider, setSelectedProvider] = useState<Provider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Start with server-prefetched values — no useEffect needed for the banner
  const [hasAnyKey] = useState(initialHasAnyKey)
  const [hasServerDefault] = useState(initialHasServerDefault)

  const next = () => {
    if (jobId) router.push(`/scan?jobId=${jobId}`)
    else router.push('/dashboard')
  }

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/user/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Failed to save')
      }
      next()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const active = PROVIDERS.find(p => p.id === selectedProvider)!

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)] flex items-center gap-2">
        <LogoMark className="h-5 w-6 flex-shrink-0" />
        <span className="text-sm font-semibold tracking-widest uppercase text-ink">Pendingly</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(11_18_32/30%)] mb-4">Step 2 of 3</p>
          <h1 className="text-3xl font-bold text-ink mb-2">Choose your AI provider</h1>
          <p className="text-[rgb(11_18_32/55%)] mb-6">
            Pendingly AI reads your threads and decides what needs attention.
            Pick a provider and add your key — you control your own billing.
          </p>

          {(hasAnyKey || hasServerDefault) && (
            <div className="flex items-start gap-2.5 bg-[rgb(26_143_94/8%)] border border-[rgb(26_143_94/25%)] rounded-lg p-3.5 mb-5">
              <ShieldCheck className="h-4 w-4 text-done flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-done">
                  {hasAnyKey ? 'An AI key is already saved on your account' : 'A server-side AI key is configured'}
                </p>
                <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">You can continue, or add / replace a key below.</p>
              </div>
            </div>
          )}

          <div className="flex gap-1.5 mb-4 flex-wrap">
            {PROVIDERS.map(p => (
              <button key={p.id} type="button"
                onClick={() => { setSelectedProvider(p.id); setApiKey(''); setError(null) }}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  selectedProvider === p.id
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-[rgb(11_18_32/60%)] border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-[rgb(11_18_32/50%)] mb-3">{active.note}</p>
          <label className="block text-xs font-medium text-ink mb-1.5">{active.label} API key</label>
          <Input type="password" placeholder={active.placeholder} value={apiKey}
            onChange={e => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} />
          {error && <p className="text-xs text-action mt-2">{error}</p>}

          <a href={active.docsUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[rgb(11_18_32/55%)] hover:text-ink mt-3 transition-colors">
            {active.docsLabel}<ExternalLink className="h-3 w-3" />
          </a>

          <div className="flex items-center gap-2 mt-6">
            <Button onClick={save} disabled={saving || !apiKey.trim()} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & continue'}
            </Button>
            <Button variant="outline" onClick={next} disabled={saving}>Skip for now</Button>
          </div>

          <div className="mt-8 space-y-2 border-t border-[rgb(11_18_32/8%)] pt-6">
            {[
              'Key stored encrypted — only Pendingly uses it for AI calls',
              'Switch providers or update your key in Settings anytime',
              'No AI key = no scanning. App works but action items won\'t appear',
              'Gemini free tier works for most users at zero cost',
            ].map(text => (
              <p key={text} className="text-xs text-[rgb(11_18_32/55%)] flex items-start gap-2">
                <span className="mt-0.5 text-action">·</span>{text}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export function AiKeyClient(props: Props) {
  return (
    <Suspense fallback={<PendinglyLoaderPage />}>
      <AiKeyStep {...props} />
    </Suspense>
  )
}
