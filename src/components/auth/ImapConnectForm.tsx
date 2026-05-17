'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Provider = 'zoho' | 'apple' | 'imap'

const PRESETS: Record<Provider, { label: string; host: string; port: number; helpText: string }> = {
  zoho:  { label: 'Zoho Mail',    host: 'imap.zoho.com',    port: 993, helpText: 'Use your Zoho Mail password or App Password' },
  apple: { label: 'Apple Mail',   host: 'imap.mail.me.com', port: 993, helpText: 'Use an App-Specific Password from appleid.apple.com' },
  imap:  { label: 'Other (IMAP)', host: '',                  port: 993, helpText: 'Enter your mail server IMAP settings' },
}

interface Props {
  initialProvider?: Provider
}

export function ImapConnectForm({ initialProvider = 'zoho' }: Props) {
  const router = useRouter()
  const [provider, setProvider] = useState<Provider>(initialProvider)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [host, setHost] = useState(PRESETS[initialProvider].host)
  const [port, setPort] = useState(String(PRESETS[initialProvider].port))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectProvider = (p: Provider) => {
    setProvider(p)
    setHost(PRESETS[p].host)
    setPort(String(PRESETS[p].port))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/integrations/imap/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, email, password, host, port }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Connection failed.')
        return
      }

      router.push(`/connect/anthropic?jobId=${data.jobId}`)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const preset = PRESETS[provider]

  return (
    <div className="rounded-lg border border-[rgb(11_18_32/10%)] bg-white p-6 mt-4">
      {/* Provider toggle */}
      <div className="flex gap-2 mb-5">
        {(Object.keys(PRESETS) as Provider[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => selectProvider(p)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all border ${
              provider === p
                ? 'border-ink bg-ink text-paper'
                : 'border-[rgb(11_18_32/15%)] text-ink hover:border-ink'
            }`}
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Email address</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Password</label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={provider === 'apple' ? 'App-specific password' : 'Password'}
            required
            disabled={loading}
          />
          <p className="text-xs text-[rgb(11_18_32/45%)] mt-1">{preset.helpText}</p>
        </div>

        {/* Host and port — pre-filled but editable only for generic IMAP */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink mb-1">IMAP host</label>
            <Input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="imap.example.com"
              required
              disabled={loading || provider !== 'imap'}
              className={provider !== 'imap' ? 'opacity-60' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Port</label>
            <Input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="993"
              required
              disabled={loading || provider !== 'imap'}
              className={provider !== 'imap' ? 'opacity-60' : ''}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-action font-medium">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </span>
          ) : (
            `Connect ${preset.label}`
          )}
        </Button>
      </form>
    </div>
  )
}
