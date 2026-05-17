'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Video, Check, ExternalLink, Loader2 } from 'lucide-react'

interface InboxStatus { hasGmail: boolean; hasOutlook: boolean }
interface ZoomStatus { connected: boolean; accountEmail: string | null; configured: boolean }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Connectors</h1>
        <p className="text-sm text-[rgb(11_18_32/55%)] mt-1">
          Wire up video conferencing and other tools. When enabled, Pendingly can schedule
          meetings with one click from any action item.
        </p>
      </div>

      {connected === 'zoom' && (
        <div className="bg-[rgb(26_143_94/8%)] border border-[rgb(26_143_94/25%)] rounded-lg p-3 text-sm text-done">
          Zoom connected.
        </div>
      )}
      {error && (
        <div className="bg-action/10 border border-action/30 rounded-lg p-3 text-sm text-action">
          {error === 'zoom_not_configured' ? 'Zoom is not configured on this server. Ask your admin to set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET.'
           : error === 'invalid_state'      ? 'Connection failed — invalid OAuth state. Try again.'
           : error === 'zoom_exchange_failed' ? 'Zoom rejected the connection. Make sure the OAuth app redirect URI matches and try again.'
           : 'Connection failed.'}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Video conferencing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* Google Meet */}
          <div className="border border-rule rounded-lg p-4 flex items-start gap-4">
            <div className="h-10 w-10 rounded-md bg-[rgb(11_18_32/4%)] flex items-center justify-center">
              <Video className="h-5 w-5 text-ink" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Google Meet</p>
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                Auto-creates Meet links on Google Calendar events. No extra setup.
              </p>
            </div>
            {inbox?.hasGmail ? (
              <span className="text-xs text-done flex items-center gap-1"><Check className="h-3.5 w-3.5" />Available</span>
            ) : (
              <span className="text-xs text-[rgb(11_18_32/50%)]">Connect Gmail first</span>
            )}
          </div>

          {/* Microsoft Teams */}
          <div className="border border-rule rounded-lg p-4 flex items-start gap-4">
            <div className="h-10 w-10 rounded-md bg-[rgb(11_18_32/4%)] flex items-center justify-center">
              <Video className="h-5 w-5 text-ink" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Microsoft Teams</p>
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                Auto-creates Teams links on Outlook Calendar events. No extra setup.
              </p>
            </div>
            {inbox?.hasOutlook ? (
              <span className="text-xs text-done flex items-center gap-1"><Check className="h-3.5 w-3.5" />Available</span>
            ) : (
              <span className="text-xs text-[rgb(11_18_32/50%)]">Connect Outlook first</span>
            )}
          </div>

          {/* Zoom */}
          <div className="border border-rule rounded-lg p-4 flex items-start gap-4">
            <div className="h-10 w-10 rounded-md bg-[rgb(11_18_32/4%)] flex items-center justify-center">
              <Video className="h-5 w-5 text-ink" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Zoom</p>
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                {zoom?.connected
                  ? `Connected as ${zoom.accountEmail || 'Zoom account'}. Meetings created via your account.`
                  : 'Schedule Zoom meetings directly from action items. Requires a Zoom account.'}
              </p>
            </div>
            {zoom == null ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : zoom.connected ? (
              <Button variant="outline" size="sm" onClick={disconnectZoom} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Disconnect'}
              </Button>
            ) : zoom.configured ? (
              <a href="/api/integrations/zoom/connect" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink border border-ink rounded-md px-3 py-1.5 hover:bg-ink hover:text-white transition-colors">
                Connect <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-[rgb(11_18_32/50%)]">Server not configured</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConnectorsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[rgb(11_18_32/55%)]">Loading…</div>}>
      <ConnectorsInner />
    </Suspense>
  )
}
