'use client'
import { useEffect, useState, Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Check, ExternalLink, Loader2, Video } from 'lucide-react'
import { GoogleMeetLogo, MicrosoftTeamsLogo, ZoomLogo } from '@/components/icons/BrandLogos'

interface InboxStatus { hasGmail: boolean; hasOutlook: boolean }
interface ZoomStatus { connected: boolean; accountEmail: string | null; configured: boolean }

type ConnectorState =
  | { kind: 'available' }
  | { kind: 'needs'; label: string }
  | { kind: 'connect'; href: string }
  | { kind: 'connected'; onDisconnect: () => void; busy: boolean }
  | { kind: 'unconfigured' }
  | { kind: 'loading' }

function StatusControl({ state }: { state: ConnectorState }) {
  switch (state.kind) {
    case 'available':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(26_143_94/10%)] px-3 py-1 text-xs font-semibold text-done">
          <Check className="h-3.5 w-3.5" /> Available
        </span>
      )
    case 'connected':
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(26_143_94/10%)] px-3 py-1 text-xs font-semibold text-done">
            <Check className="h-3.5 w-3.5" /> Connected
          </span>
          <Button variant="outline" size="sm" onClick={state.onDisconnect} disabled={state.busy}>
            {state.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Disconnect'}
          </Button>
        </div>
      )
    case 'connect':
      return (
        <a
          href={state.href}
          className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[rgb(11_18_32/85%)]"
        >
          Connect <ExternalLink className="h-3 w-3" />
        </a>
      )
    case 'needs':
      return <span className="text-xs font-medium text-[rgb(11_18_32/45%)]">{state.label}</span>
    case 'unconfigured':
      return <span className="text-xs font-medium text-[rgb(11_18_32/45%)]">Server not configured</span>
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-[rgb(11_18_32/35%)]" />
  }
}

function ConnectorRow({
  logo,
  name,
  description,
  state,
}: {
  logo: ReactNode
  name: string
  description: string
  state: ConnectorState
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rule bg-white shadow-sm">
        {logo}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[rgb(11_18_32/55%)]">{description}</p>
      </div>
      <div className="shrink-0">
        <StatusControl state={state} />
      </div>
    </div>
  )
}

function ConnectorsInner() {
  const params = useSearchParams()
  const connected = params.get('connected')
  const error = params.get('error')
  const [inbox, setInbox] = useState<InboxStatus | null>(null)
  const [zoom, setZoom] = useState<ZoomStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const loadStatus = async () => {
    const [inboxRes, zoomRes] = await Promise.all([
      fetch('/api/integrations'),
      fetch('/api/integrations/zoom/status'),
    ])
    const inboxData = inboxRes.ok ? await inboxRes.json() : null
    const zoomData = zoomRes.ok ? await zoomRes.json() : null
    const accounts: Array<{ provider: string; connectedStatus: string }> = inboxData?.accounts ?? []
    setInbox({
      hasGmail: accounts.some(a => a.provider === 'gmail' && a.connectedStatus === 'connected'),
      hasOutlook: accounts.some(a => a.provider === 'outlook' && a.connectedStatus === 'connected'),
    })
    setZoom(zoomData)
  }

  useEffect(() => { loadStatus() }, [])

  const disconnectZoom = async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/zoom/disconnect', { method: 'POST' })
      await loadStatus()
    } finally {
      setDisconnecting(false)
    }
  }

  const meetState: ConnectorState = inbox == null
    ? { kind: 'loading' }
    : inbox.hasGmail ? { kind: 'available' } : { kind: 'needs', label: 'Connect Gmail first' }

  const teamsState: ConnectorState = inbox == null
    ? { kind: 'loading' }
    : inbox.hasOutlook ? { kind: 'available' } : { kind: 'needs', label: 'Connect Outlook first' }

  const zoomState: ConnectorState = zoom == null
    ? { kind: 'loading' }
    : zoom.connected ? { kind: 'connected', onDisconnect: disconnectZoom, busy: disconnecting }
    : zoom.configured ? { kind: 'connect', href: '/api/integrations/zoom/connect' }
    : { kind: 'unconfigured' }

  return (
    <>
      <Header title="Connectors" />
      <main className="p-6 max-w-3xl">
        <p className="text-sm text-[rgb(11_18_32/55%)] mb-6 max-w-2xl">
          Wire up video conferencing and other tools. When enabled, Pendingly can schedule
          meetings with one click from any action item.
        </p>

        {connected === 'zoom' && (
          <div className="mb-5 rounded-lg border border-[rgb(26_143_94/25%)] bg-[rgb(26_143_94/8%)] p-3 text-sm text-done">
            Zoom connected successfully.
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-lg border border-action/30 bg-action/10 p-3 text-sm text-action">
            {error === 'zoom_not_configured' ? 'Zoom is not configured on this server. Ask your admin to set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET.'
             : error === 'invalid_state' ? 'Connection failed — invalid OAuth state. Try again.'
             : error === 'zoom_exchange_failed' ? 'Zoom rejected the connection. Make sure the OAuth app redirect URI matches and try again.'
             : 'Connection failed.'}
          </div>
        )}

        <section className="rounded-2xl border border-rule bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-rule bg-paper-2">
            <Video className="h-4 w-4 text-[rgb(11_18_32/45%)]" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/55%)]">Video conferencing</h2>
          </div>

          <div className="divide-y divide-rule">
            <ConnectorRow
              logo={<GoogleMeetLogo className="h-6 w-6" />}
              name="Google Meet"
              description="Auto-creates Meet links on Google Calendar events. No extra setup."
              state={meetState}
            />
            <ConnectorRow
              logo={<MicrosoftTeamsLogo className="h-7 w-7" />}
              name="Microsoft Teams"
              description="Auto-creates Teams links on Outlook Calendar events. No extra setup."
              state={teamsState}
            />
            <ConnectorRow
              logo={<ZoomLogo className="h-7 w-7" />}
              name="Zoom"
              description={zoom?.connected
                ? `Connected as ${zoom.accountEmail || 'your Zoom account'}. Meetings are created via your account.`
                : 'Schedule Zoom meetings directly from action items. Requires a Zoom account.'}
              state={zoomState}
            />
          </div>
        </section>
      </main>
    </>
  )
}

export default function ConnectorsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[rgb(11_18_32/55%)]">Loading…</div>}>
      <ConnectorsInner />
    </Suspense>
  )
}
