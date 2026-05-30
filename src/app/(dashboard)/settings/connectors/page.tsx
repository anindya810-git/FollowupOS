'use client'
import { useEffect, useState, Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Check, ExternalLink, Loader2, Video, Bell, ChevronDown } from 'lucide-react'
import {
  GoogleMeetLogo, MicrosoftTeamsLogo, ZoomLogo, SlackLogo, WhatsAppLogo,
} from '@/components/icons/BrandLogos'

interface InboxStatus { hasGmail: boolean; hasOutlook: boolean }
interface ZoomStatus { connected: boolean; accountEmail: string | null; configured: boolean }

interface DigestSettings {
  slackWebhookUrl: string | null
  slackEnabled: boolean
  teamsWebhookUrl: string | null
  teamsEnabled: boolean
  whatsappEnabled: boolean
}

const inputClass = 'h-9 w-full rounded-md border border-rule bg-white px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-action'

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

// Expandable connector row used for notification channels that need inline config.
function NotificationRow({
  logo,
  name,
  description,
  configured,
  children,
}: {
  logo: ReactNode
  name: string
  description: string
  configured: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rule bg-white shadow-sm">
          {logo}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[rgb(11_18_32/55%)]">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {configured && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(26_143_94/10%)] px-3 py-1 text-xs font-semibold text-done">
              <Check className="h-3.5 w-3.5" /> Connected
            </span>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-1 rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(11_18_32/65%)] transition-colors hover:border-[rgb(11_18_32/25%)] hover:text-ink"
          >
            {open ? 'Close' : configured ? 'Edit' : 'Set up'}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-rule bg-paper-2 px-5 py-4">
          {children}
        </div>
      )}
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
  const [digest, setDigest] = useState<DigestSettings | null>(null)
  const [savingChannel, setSavingChannel] = useState<string | null>(null)
  const [savedChannel, setSavedChannel] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  const loadStatus = async () => {
    const [inboxRes, zoomRes, settingsRes] = await Promise.all([
      fetch('/api/integrations'),
      fetch('/api/integrations/zoom/status'),
      fetch('/api/settings'),
    ])
    const inboxData = inboxRes.ok ? await inboxRes.json() : null
    const zoomData = zoomRes.ok ? await zoomRes.json() : null
    const settingsData = settingsRes.ok ? await settingsRes.json() : null
    const accounts: Array<{ provider: string; connectedStatus: string }> = inboxData?.accounts ?? []
    setInbox({
      hasGmail: accounts.some(a => a.provider === 'gmail' && a.connectedStatus === 'connected'),
      hasOutlook: accounts.some(a => a.provider === 'outlook' && a.connectedStatus === 'connected'),
    })
    setZoom(zoomData)
    const d = settingsData?.digestSettings
    setDigest({
      slackWebhookUrl: d?.slackWebhookUrl ?? '',
      slackEnabled: d?.slackEnabled ?? false,
      teamsWebhookUrl: d?.teamsWebhookUrl ?? '',
      teamsEnabled: d?.teamsEnabled ?? false,
      whatsappEnabled: d?.whatsappEnabled ?? false,
    })
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

  const saveChannel = async (channel: string, payload: Record<string, unknown>) => {
    setSavingChannel(channel)
    setSavedChannel(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSavedChannel(channel)
        setTimeout(() => setSavedChannel(null), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setTestResult(r => ({ ...r, [channel]: data.error || 'Save failed' }))
      }
    } finally {
      setSavingChannel(null)
    }
  }

  const runTest = async (channel: string, url: string, body?: Record<string, unknown>) => {
    setTesting(channel)
    setTestResult(r => ({ ...r, [channel]: '' }))
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      setTestResult(r => ({ ...r, [channel]: res.ok ? 'Test message sent!' : (data.error || 'Failed') }))
    } catch {
      setTestResult(r => ({ ...r, [channel]: 'Failed' }))
    } finally {
      setTesting(null)
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
          Wire up video conferencing, chat notifications, and other tools. When enabled, Pendingly
          can schedule meetings and push your daily digest to the channels you use.
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

        {/* ── Video conferencing ── */}
        <section className="rounded-2xl border border-rule bg-white overflow-hidden mb-6">
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

        {/* ── Notifications ── */}
        <section className="rounded-2xl border border-rule bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-rule bg-paper-2">
            <Bell className="h-4 w-4 text-[rgb(11_18_32/45%)]" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/55%)]">Notifications</h2>
          </div>

          {digest == null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[rgb(11_18_32/35%)]" />
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {/* Slack */}
              <NotificationRow
                logo={<SlackLogo className="h-7 w-7" />}
                name="Slack"
                description="Post your daily digest of pending follow-ups to a Slack channel via webhook."
                configured={digest.slackEnabled && !!digest.slackWebhookUrl}
              >
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={digest.slackEnabled}
                      onChange={e => setDigest(d => d && ({ ...d, slackEnabled: e.target.checked }))}
                      className="h-4 w-4 accent-action"
                    />
                    <span className="text-sm font-medium text-ink">Send daily digest to Slack</span>
                  </label>
                  <div>
                    <label className="block text-xs font-semibold text-[rgb(11_18_32/55%)] mb-1">Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={digest.slackWebhookUrl ?? ''}
                      onChange={e => setDigest(d => d && ({ ...d, slackWebhookUrl: e.target.value }))}
                      className={inputClass}
                    />
                    <p className="text-xs text-[rgb(11_18_32/45%)] mt-1">
                      Get a webhook URL from{' '}
                      <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="underline">api.slack.com/messaging/webhooks</a>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveChannel('slack', { slackEnabled: digest.slackEnabled, slackWebhookUrl: digest.slackWebhookUrl })}
                      disabled={savingChannel === 'slack'}
                    >
                      {savingChannel === 'slack' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : savedChannel === 'slack' ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testing === 'slack' || !digest.slackWebhookUrl}
                      onClick={() => runTest('slack', '/api/integrations/slack/test', { webhookUrl: digest.slackWebhookUrl })}
                    >
                      {testing === 'slack' ? 'Sending…' : 'Send Test'}
                    </Button>
                    {testResult.slack && <span className="text-xs text-[rgb(11_18_32/55%)]">{testResult.slack}</span>}
                  </div>
                </div>
              </NotificationRow>

              {/* Microsoft Teams */}
              <NotificationRow
                logo={<MicrosoftTeamsLogo className="h-7 w-7" />}
                name="Microsoft Teams"
                description="Post your daily digest to a Teams channel via an incoming webhook."
                configured={digest.teamsEnabled && !!digest.teamsWebhookUrl}
              >
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={digest.teamsEnabled}
                      onChange={e => setDigest(d => d && ({ ...d, teamsEnabled: e.target.checked }))}
                      className="h-4 w-4 accent-action"
                    />
                    <span className="text-sm font-medium text-ink">Send daily digest to Microsoft Teams</span>
                  </label>
                  <div>
                    <label className="block text-xs font-semibold text-[rgb(11_18_32/55%)] mb-1">Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://xxx.webhook.office.com/webhookb2/..."
                      value={digest.teamsWebhookUrl ?? ''}
                      onChange={e => setDigest(d => d && ({ ...d, teamsWebhookUrl: e.target.value }))}
                      className={inputClass}
                    />
                    <p className="text-xs text-[rgb(11_18_32/45%)] mt-1">Create an incoming webhook in your Teams channel settings.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveChannel('teams', { teamsEnabled: digest.teamsEnabled, teamsWebhookUrl: digest.teamsWebhookUrl })}
                      disabled={savingChannel === 'teams'}
                    >
                      {savingChannel === 'teams' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : savedChannel === 'teams' ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testing === 'teams' || !digest.teamsWebhookUrl}
                      onClick={() => runTest('teams', '/api/integrations/teams/test', { webhookUrl: digest.teamsWebhookUrl })}
                    >
                      {testing === 'teams' ? 'Sending…' : 'Send Test'}
                    </Button>
                    {testResult.teams && <span className="text-xs text-[rgb(11_18_32/55%)]">{testResult.teams}</span>}
                  </div>
                </div>
              </NotificationRow>

              {/* WhatsApp */}
              <NotificationRow
                logo={<WhatsAppLogo className="h-7 w-7" />}
                name="WhatsApp"
                description="Receive your daily digest as a WhatsApp message to your saved phone number."
                configured={digest.whatsappEnabled}
              >
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={digest.whatsappEnabled}
                      onChange={e => setDigest(d => d && ({ ...d, whatsappEnabled: e.target.checked }))}
                      className="h-4 w-4 accent-action"
                    />
                    <span className="text-sm font-medium text-ink">Send daily digest via WhatsApp</span>
                  </label>
                  <p className="text-xs text-[rgb(11_18_32/55%)]">
                    Sent to the phone number saved in your{' '}
                    <a href="/settings?section=account" className="underline text-ink hover:text-action">Account settings</a>.
                    Requires Twilio credentials to be configured on the server.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveChannel('whatsapp', { whatsappEnabled: digest.whatsappEnabled })}
                      disabled={savingChannel === 'whatsapp'}
                    >
                      {savingChannel === 'whatsapp' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : savedChannel === 'whatsapp' ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testing === 'whatsapp' || !digest.whatsappEnabled}
                      onClick={() => runTest('whatsapp', '/api/integrations/whatsapp/test')}
                    >
                      {testing === 'whatsapp' ? 'Sending…' : 'Send Test'}
                    </Button>
                    {testResult.whatsapp && <span className="text-xs text-[rgb(11_18_32/55%)]">{testResult.whatsapp}</span>}
                  </div>
                </div>
              </NotificationRow>
            </div>
          )}

          <div className="px-5 py-3 border-t border-rule bg-paper-2">
            <p className="text-xs text-[rgb(11_18_32/45%)]">
              Digest timing and the device push toggle live under{' '}
              <a href="/settings?section=notifications" className="underline hover:text-ink">Settings → Notifications</a>.
            </p>
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
