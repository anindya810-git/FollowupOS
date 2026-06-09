'use client'
import React, { useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, AlertTriangle, LogOut, RefreshCw, Loader2, Check, ChevronDown, RotateCcw, Sparkles, Camera, RotateCw, Plug, Eye, Pause, Play, Server, Users } from 'lucide-react'
import { GoogleCalendarLogo, OutlookCalendarLogo, AppleCalendarLogo, ZohoMailLogo } from '@/components/icons/BrandLogos'
import { ImapConnectForm } from '@/components/auth/ImapConnectForm'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { DEFAULT_FOLLOWUP_TEMPLATE } from '@/lib/templates'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { NOISE_LEVEL_LABELS } from '@/lib/noise-filter'

const COMMON_TIMEZONES = [
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Dubai', 'Asia/Hong_Kong',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

interface LastScan {
  status: string
  threadsFound: number
  threadsProcessed: number
  actionItemsCreated: number
  errorMessage: string | null
  createdAt: string
}

interface EmailAccount {
  id: string
  emailAddress: string
  provider: string
  connectedStatus: string
  lastSyncedAt?: string | null
  webmailBaseUrl?: string | null
  webmailSearchUrlTemplate?: string | null
  noiseFilterLevel?: number | null
  scanInstructions?: string | null
  autoScanIntervalMinutes?: number | null
  lastScan?: LastScan | null
}

type SectionId = 'inboxes' | 'notifications' | 'automation' | 'ai' | 'account'

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'inboxes', label: 'Inboxes' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'automation', label: 'Automation' },
  { id: 'ai', label: 'Pendingly AI Backend' },
  { id: 'account', label: 'Account' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<{
    appSettings: {
      defaultFollowupDays: number;
      scanWindowDays: number;
      conservativeMode: boolean;
      autoFollowupEnabled?: boolean;
      autoFollowupDays?: number;
      autoFollowupTemplate?: string | null;
      followupSequenceJson?: string | null;
      signatureHtml?: string | null;
      calendarAutoCreate?: 'off' | 'event' | 'task' | 'both';
      defaultMeetingProvider?: 'none' | 'meet' | 'teams' | 'zoom';
      reminderPushEnabled?: boolean;
      emailSignatureEnabled?: boolean;
      noiseFilterLevel?: number;
      scanInstructions?: string | null;
      autoScanIntervalMinutes?: number;
      automationPaused?: boolean;
      followupApprovalMode?: boolean;
    } | null
    digestSettings: { isEnabled: boolean; digestTime: string; timezone: string; slackWebhookUrl?: string | null; slackEnabled?: boolean; teamsWebhookUrl?: string | null; teamsEnabled?: boolean; whatsappEnabled?: boolean } | null
    ignoredSenders: Array<{ id: string; senderEmail?: string; domain?: string; reason?: string }>
    watchList?: Array<{ id: string; senderEmail?: string | null; domain?: string | null; threadId?: string | null; label?: string | null }>
  }>({ appSettings: null, digestSettings: null, ignoredSenders: [], watchList: [] })
  const [integrations, setIntegrations] = useState<EmailAccount[]>(() => {
    try {
      const cached = localStorage.getItem('pendingly_integrations')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [activeSection, setActiveSection] = useState<SectionId>('inboxes')
  const [newSender, setNewSender] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [openErrorLogs, setOpenErrorLogs] = useState<Set<string>>(new Set())
  const [pausedScans, setPausedScans] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const paused = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('pendingly_scan_paused_')) paused.add(k.slice('pendingly_scan_paused_'.length))
    }
    setPausedScans(paused)
  }, [])

  const toggleScanPause = async (accountId: string, scanning: boolean) => {
    const key = 'pendingly_scan_paused_' + accountId
    const currentlyPaused = pausedScans.has(accountId)
    if (!currentlyPaused && scanning) {
      await fetch('/api/scan/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      }).catch(() => {})
      fetchIntegrations()
    }
    setPausedScans(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
        localStorage.removeItem(key)
      } else {
        next.add(accountId)
        localStorage.setItem(key, '1')
      }
      return next
    })
  }
  const [syncingContacts, setSyncingContacts] = useState(false)
  const [contactsSynced, setContactsSynced] = useState<number | null>(null)
  const [addInboxOpen, setAddInboxOpen] = useState(false)
  const [imapProvider, setImapProvider] = useState<'zoho' | 'apple' | 'imap' | null>(null)
  const [syncingContactsFor, setSyncingContactsFor] = useState<string | null>(null)
  const [syncedContactsFor, setSyncedContactsFor] = useState<Record<string, number>>({})
  const addInboxRef = React.useRef<HTMLDivElement>(null)
  const [generatingSig, setGeneratingSig] = useState(false)
  const [sigGenError, setSigGenError] = useState<string | null>(null)
  const [justConnected, setJustConnected] = useState<string | null>(null)
  const [setupAccount, setSetupAccount] = useState<{ id: string; provider: string } | null>(null)

  // When redirected here after connecting an additional inbox, open the scan
  // setup prompt (sensitivity + instructions) before the first scan, or show
  // the background-scan banner. Read from window.location so we don't need a
  // Suspense boundary for useSearchParams. Clean the URL afterwards.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setup = params.get('setup')
    const setupAccountId = params.get('account')
    const connected = params.get('connected')
    if (setup && setupAccountId) {
      setSetupAccount({ id: setupAccountId, provider: setup })
      setActiveSection('inboxes')
      window.history.replaceState({}, '', '/settings')
    } else if (connected) {
      setJustConnected(connected === 'outlook' ? 'Outlook' : connected === 'gmail' ? 'Gmail' : connected)
      setActiveSection('inboxes')
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  // Save the chosen sensitivity + instructions for the new inbox, then kick off
  // its first scan in the background.
  const startSetupScan = async (level: number, instructions: string) => {
    if (!setupAccount) return
    const acct = setupAccount
    await fetch(`/api/integrations/${acct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noiseFilterLevel: level, scanInstructions: instructions.trim() || null }),
    }).catch(() => {})
    markScanStarting([acct.id])
    await fetch('/api/scan/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: acct.id }),
    }).catch(() => {})
    setJustConnected(acct.provider === 'outlook' ? 'Outlook' : 'Gmail')
    setSetupAccount(null)
    fetchIntegrations()
  }

  const fetchIntegrations = async () => {
    try {
      const r = await fetch('/api/integrations', { cache: 'no-store' })
      if (!r.ok) return []
      const i = await r.json()
      const accounts = i.accounts || []
      setIntegrations(accounts)
      try { localStorage.setItem('pendingly_integrations', JSON.stringify(accounts)) } catch {}
      return accounts
    } catch {
      // Network/parse error — don't strand the UI; the next poll will retry.
      return []
    }
  }

  // Optimistically flip the given inboxes into a synthetic "starting" state the
  // instant the user clicks Sync — shows the progress bar immediately without
  // waiting for the server round-trip. We deliberately use the fake status
  // 'starting' (not 'queued'/'running') so the button stays as "Sync now" (busy
  // spinner) rather than switching to "Cancel scan" before the job actually exists
  // in the database. Once the server responds and fetchIntegrations brings back real
  // data, the real status takes over.
  const markScanStarting = (accountIds: string[]) =>
    setIntegrations(prev => prev.map(a =>
      accountIds.includes(a.id)
        ? {
            ...a,
            lastScan: {
              status: 'starting',
              threadsFound: 0,
              threadsProcessed: 0,
              actionItemsCreated: 0,
              errorMessage: null,
              createdAt: new Date().toISOString(),
            },
          }
        : a
    ))

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetchIntegrations(),
    ]).then(([s]) => {
      setSettings(s)
    })
  }, [])

  // Poll every 2 s while any account has an active scan so progress and
  // completion states appear quickly (fast scans can finish in < 4 s).
  // Also treats the synthetic 'starting' status as active so polling begins
  // the moment the user clicks Sync.
  useEffect(() => {
    const hasScanRunning = integrations.some(
      a => a.lastScan?.status === 'running' || a.lastScan?.status === 'queued' || a.lastScan?.status === 'starting'
    )
    if (!hasScanRunning) return
    const id = setInterval(fetchIntegrations, 2000)
    return () => clearInterval(id)
  }, [integrations])

  // Auto-resume background scans that stall (the serverless function can die
  // mid-scan on a large mailbox). If an account's scan hasn't progressed for
  // ~90s, nudge /api/scan/start, which resumes the same job where it left off.
  const scanProgressRef = useRef<Map<string, { processed: number; at: number; resumes: number }>>(new Map())
  useEffect(() => {
    const now = Date.now()
    for (const a of integrations) {
      const s = a.lastScan
      if (!s || (s.status !== 'running' && s.status !== 'queued')) {
        scanProgressRef.current.delete(a.id)
        continue
      }
      const processed = s.threadsProcessed || 0
      const prev = scanProgressRef.current.get(a.id)
      if (!prev || processed > prev.processed) {
        scanProgressRef.current.set(a.id, { processed, at: now, resumes: prev?.resumes ?? 0 })
      } else if (now - prev.at > 90_000 && prev.resumes < 8) {
        scanProgressRef.current.set(a.id, { processed, at: now, resumes: prev.resumes + 1 })
        fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: a.id }),
        }).catch(() => {})
      }
    }
  }, [integrations])

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultFollowupDays: settings.appSettings?.defaultFollowupDays,
        conservativeMode: settings.appSettings?.conservativeMode,
        isEnabled: settings.digestSettings?.isEnabled,
        digestTime: settings.digestSettings?.digestTime,
        slackWebhookUrl: settings.digestSettings?.slackWebhookUrl ?? null,
        slackEnabled: settings.digestSettings?.slackEnabled ?? false,
        teamsWebhookUrl: settings.digestSettings?.teamsWebhookUrl ?? null,
        teamsEnabled: settings.digestSettings?.teamsEnabled ?? false,
        whatsappEnabled: settings.digestSettings?.whatsappEnabled ?? false,
        autoFollowupEnabled: settings.appSettings?.autoFollowupEnabled ?? false,
        autoFollowupDays: settings.appSettings?.autoFollowupDays ?? 3,
        autoFollowupTemplate: settings.appSettings?.autoFollowupTemplate ?? null,
        followupSequenceJson: settings.appSettings?.followupSequenceJson ?? null,
        signatureHtml: settings.appSettings?.signatureHtml ?? null,
        calendarAutoCreate: settings.appSettings?.calendarAutoCreate ?? 'off',
        defaultMeetingProvider: settings.appSettings?.defaultMeetingProvider ?? 'none',
        reminderPushEnabled: settings.appSettings?.reminderPushEnabled ?? true,
        emailSignatureEnabled: settings.appSettings?.emailSignatureEnabled ?? true,
        noiseFilterLevel: settings.appSettings?.noiseFilterLevel ?? 3,
        scanInstructions: settings.appSettings?.scanInstructions ?? null,
        autoScanIntervalMinutes: settings.appSettings?.autoScanIntervalMinutes ?? 1,
        followupApprovalMode: settings.appSettings?.followupApprovalMode ?? false,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const generateSignature = async () => {
    setGeneratingSig(true)
    setSigGenError(null)
    try {
      const res = await fetch('/api/settings/generate-signature', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) { setSigGenError(data.error ?? 'Generation failed'); return }
      setSettings(s => ({ ...s, appSettings: s.appSettings ? { ...s.appSettings, signatureHtml: data.html } : { defaultFollowupDays: 3, scanWindowDays: 30, conservativeMode: true, signatureHtml: data.html } }))
    } catch { setSigGenError('Network error') }
    finally { setGeneratingSig(false) }
  }

  const disconnectAccount = async (account: EmailAccount) => {
    const providerLabels: Record<string, string> = {
      gmail: 'Gmail',
      outlook: 'Outlook',
      zoho: 'Zoho Mail',
      apple: 'Apple Mail',
      imap: 'IMAP',
    }
    const providerLabel = providerLabels[account.provider] || account.provider
    if (!confirm(`Disconnect ${account.emailAddress} (${providerLabel})? This will stop future scans.`)) return

    const imapProviders = ['zoho', 'apple', 'imap']
    const endpoint = imapProviders.includes(account.provider)
      ? '/api/integrations/imap/disconnect'
      : account.provider === 'outlook'
        ? '/api/integrations/outlook/disconnect'
        : '/api/integrations/gmail/disconnect'

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: account.id }),
    })

    setIntegrations(prev => prev.filter(a => a.id !== account.id))
  }

  const addIgnoredSender = async () => {
    if (!newSender.trim()) return
    const isDomain = !newSender.includes('@')
    await fetch('/api/settings/ignored-senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isDomain ? { domain: newSender } : { sender_email: newSender }),
    })
    setNewSender('')
    fetch('/api/settings').then(r => r.json()).then(setSettings)
  }

  const removeIgnoredSender = async (id: string) => {
    await fetch(`/api/settings/ignored-senders/${id}`, { method: 'DELETE' })
    setSettings(s => ({ ...s, ignoredSenders: s.ignoredSenders.filter(x => x.id !== id) }))
  }

  // "Pause everything" is a one-tap master switch — it saves immediately
  // (not via the section's Save button) so it's instantly trustworthy.
  const togglePause = async (paused: boolean) => {
    setSettings(s => ({ ...s, appSettings: s.appSettings ? { ...s.appSettings, automationPaused: paused } : s.appSettings }))
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automationPaused: paused }),
    }).catch(() => {})
  }

  const syncContacts = async () => {
    setSyncingContacts(true)
    setContactsSynced(null)
    try {
      const res = await fetch('/api/contacts', { method: 'POST' })
      const data = await res.json()
      setContactsSynced(data.synced ?? 0)
    } finally {
      setSyncingContacts(false)
    }
  }

  const syncContactsForInbox = async (accountId: string) => {
    setSyncingContactsFor(accountId)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inbox_ids: [accountId] }),
      })
      const data = await res.json()
      setSyncedContactsFor(prev => ({ ...prev, [accountId]: data.synced ?? 0 }))
      setTimeout(() => setSyncedContactsFor(prev => { const next = { ...prev }; delete next[accountId]; return next }), 3000)
    } finally {
      setSyncingContactsFor(null)
    }
  }

  // Close "Add Inbox" dropdown on outside click
  React.useEffect(() => {
    if (!addInboxOpen) return
    const handler = (e: MouseEvent) => {
      if (addInboxRef.current && !addInboxRef.current.contains(e.target as Node)) setAddInboxOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addInboxOpen])

  const replayTour = async () => {
    await fetch('/api/onboarding/reset', { method: 'POST' })
    window.location.href = '/dashboard'
  }

  const deleteAccount = async () => {
    if (!confirm('Delete your account and all data? This cannot be undone.')) return
    await fetch('/api/account', { method: 'DELETE' })
    window.location.href = '/'
  }

  const saveButton = (
    <Button onClick={save} disabled={saving} className="w-full">
      {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
    </Button>
  )

  return (
    <>
      <Header title="Settings" />
      <main className="p-4 md:p-6 max-w-4xl flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Section nav — horizontal scroll on mobile, sidebar on desktop */}
        <nav className="flex md:flex-col md:w-48 shrink-0 gap-1 md:gap-0.5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`shrink-0 md:w-full text-left whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === s.id
                  ? 'bg-[rgb(11_18_32/8%)] font-medium text-ink'
                  : 'text-[rgb(11_18_32/55%)] hover:text-ink hover:bg-[rgb(11_18_32/4%)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ── Inboxes ── */}
          {activeSection === 'inboxes' && (
            <>

          {justConnected && (
            <div className="flex items-start gap-3 rounded-lg border border-[rgb(26_143_94/25%)] bg-[rgb(26_143_94/8%)] px-4 py-3">
              <Check className="h-4 w-4 text-done flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-ink">{justConnected} connected — scanning in the background</p>
                <p className="text-[rgb(11_18_32/55%)] mt-0.5">
                  We&apos;re building this inbox&apos;s action queue now. You can keep using Pendingly — progress shows below and new items appear automatically.
                </p>
              </div>
              <button
                onClick={() => setJustConnected(null)}
                className="text-[rgb(11_18_32/40%)] hover:text-ink text-xs flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Connected Inboxes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Connected Inboxes</CardTitle>
                {integrations.length > 0 && (
                  <SyncAllButton integrations={integrations} onStarted={fetchIntegrations} onSyncStart={() => markScanStarting(integrations.map(a => a.id))} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {integrations.length === 0 ? (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[rgb(11_18_32/55%)]">No email accounts connected</span>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {integrations.map(account => {
                    const isImapStyle = ['zoho', 'apple', 'imap'].includes(account.provider)
                    return (
                    <div key={account.id} className="rounded-lg border border-[rgb(11_18_32/8%)] bg-paper px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-ink break-all">{account.emailAddress}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium bg-[rgb(11_18_32/8%)] text-ink whitespace-nowrap">
                              {account.provider === 'outlook' ? 'Outlook' : account.provider === 'zoho' ? 'Zoho Mail' : account.provider === 'apple' ? 'Apple Mail' : account.provider === 'imap' ? 'IMAP' : 'Gmail'}
                            </span>
                            <span className="text-xs text-[rgb(11_18_32/55%)] capitalize whitespace-nowrap">{account.connectedStatus}</span>
                            {pausedScans.has(account.id) && (
                              <span className="text-xs text-amber-600 font-medium whitespace-nowrap">· paused</span>
                            )}
                            {account.lastSyncedAt && (
                              <span className="text-xs text-[rgb(11_18_32/38%)] whitespace-nowrap">· synced {(() => {
                                const diff = Date.now() - new Date(account.lastSyncedAt).getTime()
                                const mins = Math.floor(diff / 60_000)
                                if (mins < 1) return 'just now'
                                if (mins < 60) return `${mins}m ago`
                                const hrs = Math.floor(mins / 60)
                                if (hrs < 24) return `${hrs}h ago`
                                return `${Math.floor(hrs / 24)}d ago`
                              })()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <InboxSyncButton accountId={account.id} scanning={account.lastScan?.status === 'running' || account.lastScan?.status === 'queued'} onCancelled={fetchIntegrations} onStarted={fetchIntegrations} onSyncStart={() => markScanStarting([account.id])} />
                          <button
                            type="button"
                            onClick={() => toggleScanPause(account.id, account.lastScan?.status === 'running' || account.lastScan?.status === 'queued' || false)}
                            title={pausedScans.has(account.id) ? 'Resume auto-scan' : 'Pause auto-scan'}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-[rgb(11_18_32/12%)] bg-white text-[rgb(11_18_32/45%)] hover:text-ink hover:border-[rgb(11_18_32/25%)] transition-colors"
                          >
                            {pausedScans.has(account.id) ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                          </button>
                          <Button variant="outline" size="sm" onClick={() => disconnectAccount(account)}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                      {account.lastScan && (() => {
                        const scan = account.lastScan
                        const isRunning = scan.status === 'running' || scan.status === 'queued' || scan.status === 'starting'
                        const isCancelled = scan.status === 'failed' && scan.errorMessage === 'Cancelled by user.'
                        const hasError = scan.status === 'failed' && !!scan.errorMessage && !isCancelled
                        const hasFailed = isCancelled || hasError
                        const pct = isRunning && scan.threadsFound > 0
                          ? Math.round((scan.threadsProcessed / scan.threadsFound) * 100)
                          : 0
                        const bgStyle = isRunning
                          ? { background: `linear-gradient(to right, rgb(99 102 241 / 12%) ${pct}%, rgb(11 18 32 / 4%) ${pct}%)` }
                          : undefined
                        // Short summary: just the "N AI failures" part before the em-dash
                        const errorSummary = (() => {
                          if (!scan.errorMessage) return ''
                          if (isCancelled) return 'Cancelled by user'
                          const dashIdx = scan.errorMessage.indexOf(' — ')
                          return dashIdx > 0
                            ? scan.errorMessage.slice(0, dashIdx).trim()
                            : scan.errorMessage.slice(0, 60).trim()
                        })()
                        const logOpen = openErrorLogs.has(account.id)
                        const toggleLog = () => setOpenErrorLogs(prev => {
                          const next = new Set(prev)
                          logOpen ? next.delete(account.id) : next.add(account.id)
                          return next
                        })
                        return (
                          <div
                            className={`mt-2 rounded px-3 py-2 text-xs transition-all duration-500 ${hasError ? 'bg-[rgb(242_90_60/8%)] border border-[rgb(242_90_60/20%)]' : isCancelled ? 'bg-[rgb(11_18_32/4%)] border border-[rgb(11_18_32/8%)]' : 'text-[rgb(11_18_32/55%)]'}`}
                            style={!hasFailed ? (bgStyle ?? { background: 'rgb(11 18 32 / 4%)' }) : undefined}
                          >
                            {isRunning ? (
                              <div className="flex justify-between items-center">
                                {pausedScans.has(account.id) ? (
                                  <span className="font-medium text-amber-600">Paused</span>
                                ) : (
                                  <span className="font-medium text-ink flex items-center gap-1.5">
                                    Scanning… <ScanElapsedTimer startedAt={scan.createdAt} />
                                  </span>
                                )}
                                {scan.threadsFound > 0 ? (
                                  <span>{scan.threadsProcessed}/{scan.threadsFound} threads · {pct}%</span>
                                ) : (
                                  <span className="text-[rgb(11_18_32/55%)]">Starting…</span>
                                )}
                              </div>
                            ) : hasFailed ? (
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-medium ${hasError ? 'text-action' : 'text-[rgb(11_18_32/60%)]'}`}>
                                    {hasError ? '⚠ ' : '○ '}{errorSummary} · {scan.threadsProcessed} threads · {scan.actionItemsCreated} action items
                                  </span>
                                  {scan.errorMessage && (
                                    <button
                                      onClick={toggleLog}
                                      className="shrink-0 text-[11px] text-[rgb(11_18_32/50%)] hover:text-ink underline"
                                    >
                                      {logOpen ? 'Hide log' : 'View log'}
                                    </button>
                                  )}
                                </div>
                                {logOpen && scan.errorMessage && (
                                  <pre className={`mt-2 text-[10px] text-[rgb(11_18_32/70%)] bg-white/70 rounded border p-2 overflow-auto max-h-40 whitespace-pre-wrap break-words leading-relaxed ${hasError ? 'border-[rgb(242_90_60/15%)]' : 'border-[rgb(11_18_32/10%)]'}`}>
                                    {scan.errorMessage}
                                  </pre>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span>
                                  {scan.threadsProcessed === 0
                                    ? <>No new emails since last sync · use <strong>Reset &amp; rescan</strong> (▾ dropdown) to re-evaluate all</>
                                    : <>Last scan: {scan.threadsProcessed} threads · {scan.actionItemsCreated} action items found{errorSummary ? ` · ⚠ ${errorSummary}` : ''}</>
                                  }
                                </span>
                                {errorSummary && (
                                  <button onClick={toggleLog} className="shrink-0 text-[11px] text-[rgb(11_18_32/50%)] hover:text-ink underline">
                                    {logOpen ? 'Hide log' : 'View log'}
                                  </button>
                                )}
                              </div>
                            )}
                            {logOpen && scan.errorMessage && !isRunning && !hasFailed && (
                              <pre className="mt-2 text-[10px] text-[rgb(11_18_32/70%)] bg-white/70 rounded border border-[rgb(11_18_32/10%)] p-2 overflow-auto max-h-40 whitespace-pre-wrap break-words leading-relaxed">
                                {scan.errorMessage}
                              </pre>
                            )}
                          </div>
                        )
                      })()}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[rgb(11_18_32/50%)]">Scan every</span>
                        <select
                          value={String(account.autoScanIntervalMinutes ?? '')}
                          onChange={async e => {
                            const val = e.target.value === '' ? null : Number(e.target.value)
                            setIntegrations(prev => prev.map(a => a.id === account.id ? { ...a, autoScanIntervalMinutes: val } : a))
                            await fetch(`/api/integrations/${account.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ autoScanIntervalMinutes: val }),
                            }).catch(() => {})
                          }}
                          className="h-7 rounded border border-[rgb(11_18_32/12%)] bg-white px-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-action"
                        >
                          <option value="">Default ({settings.appSettings?.autoScanIntervalMinutes ?? 1} min)</option>
                          <option value="1">1 min</option>
                          <option value="2">2 min</option>
                          <option value="5">5 min</option>
                          <option value="10">10 min</option>
                          <option value="15">15 min</option>
                          <option value="30">30 min</option>
                          <option value="60">1 hour</option>
                        </select>
                      </div>
                      {isImapStyle && (
                        <WebmailUrlField
                          account={account}
                          onSaved={(url, template) => setIntegrations(prev => prev.map(a => a.id === account.id ? { ...a, webmailBaseUrl: url, webmailSearchUrlTemplate: template ?? a.webmailSearchUrlTemplate } : a))}
                        />
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => syncContactsForInbox(account.id)}
                          disabled={syncingContactsFor === account.id}
                          className="flex items-center gap-1 text-xs text-[rgb(11_18_32/45%)] hover:text-ink transition-colors disabled:opacity-50"
                        >
                          {syncingContactsFor === account.id
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Syncing contacts…</>
                            : <><Users className="h-3 w-3" /> Sync contacts</>
                          }
                        </button>
                        {syncedContactsFor[account.id] !== undefined && (
                          <span className="text-xs text-[rgb(11_18_32/40%)]">· {syncedContactsFor[account.id]} synced</span>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 mb-4 pb-4 border-t border-[rgb(11_18_32/6%)] pt-4 flex-wrap">
                <span className="text-xs font-medium text-ink shrink-0">Default scan interval</span>
                <select
                  value={String(settings.appSettings?.autoScanIntervalMinutes ?? 1)}
                  onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, autoScanIntervalMinutes: Number(e.target.value) } }))}
                  className="h-7 rounded border border-[rgb(11_18_32/12%)] bg-white px-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-action"
                >
                  <option value="1">1 min</option>
                  <option value="2">2 min</option>
                  <option value="5">5 min</option>
                  <option value="10">10 min</option>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                </select>
                <span className="text-xs text-[rgb(11_18_32/40%)]">— applies to all inboxes unless overridden above (saved with Settings)</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Add Inbox dropdown */}
                <div className="relative" ref={addInboxRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddInboxOpen(o => !o)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Inbox
                    <ChevronDown className={`h-3 w-3 transition-transform ${addInboxOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {addInboxOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] bg-white border border-[rgb(11_18_32/10%)] rounded-xl shadow-lg overflow-hidden">
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] border-b border-[rgb(11_18_32/8%)]">Choose provider</p>
                      {[
                        { label: 'Gmail', icon: <GoogleCalendarLogo className="h-4 w-4" />, action: () => { window.location.href = '/api/integrations/gmail/connect' } },
                        { label: 'Outlook', icon: <OutlookCalendarLogo className="h-4 w-4" />, action: () => { window.location.href = '/api/integrations/outlook/connect' } },
                        { label: 'Apple Mail', icon: <AppleCalendarLogo className="h-4 w-4" />, action: () => setImapProvider('apple') },
                        { label: 'Zoho Mail', icon: <ZohoMailLogo className="h-4 w-4" />, action: () => setImapProvider('zoho') },
                        { label: 'Custom Inbox (IMAP)', icon: <Server className="h-4 w-4 text-[rgb(11_18_32/50%)]" />, action: () => setImapProvider('imap') },
                      ].map(opt => (
                        <button
                          key={opt.label}
                          onClick={() => { setAddInboxOpen(false); opt.action() }}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-[rgb(11_18_32/4%)] transition-colors"
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <a
                  href="/settings/scan-logs"
                  className="ml-auto text-xs text-[rgb(11_18_32/55%)] hover:text-ink underline transition-colors"
                >
                  View scan logs →
                </a>
              </div>

              {/* Inline IMAP connect form */}
              {imapProvider && (
                <div className="mt-4 rounded-xl border border-[rgb(11_18_32/10%)] bg-[rgb(11_18_32/2%)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-ink">
                      Connect {imapProvider === 'apple' ? 'Apple Mail' : imapProvider === 'zoho' ? 'Zoho Mail' : 'Custom Inbox (IMAP)'}
                    </p>
                    <button onClick={() => setImapProvider(null)} className="text-[rgb(11_18_32/35%)] hover:text-ink text-xs underline">Cancel</button>
                  </div>
                  <ImapConnectForm initialProvider={imapProvider} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scan Aggressiveness — global default + per-inbox override via scope dropdown */}
          <ScanAggressivenessCard
            globalLevel={settings.appSettings?.noiseFilterLevel ?? 3}
            onGlobalLevelChange={n => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, noiseFilterLevel: n } }))}
            onSaveGlobal={save}
            savingGlobal={saving}
            savedGlobal={saved}
            inboxes={integrations}
            onInboxSaved={(id, level) => setIntegrations(prev => prev.map(a => a.id === id ? { ...a, noiseFilterLevel: level } : a))}
          />

          {/* Teach Pendingly — global default + per-inbox override via scope dropdown */}
          <TeachPendinglyCard
            globalValue={settings.appSettings?.scanInstructions ?? ''}
            onGlobalChange={v => setSettings(s => ({ ...s, appSettings: s.appSettings ? { ...s.appSettings, scanInstructions: v } : { defaultFollowupDays: 3, scanWindowDays: 30, conservativeMode: true, scanInstructions: v } }))}
            onSaveGlobal={save}
            savingGlobal={saving}
            savedGlobal={saved}
            inboxes={integrations}
            onInboxSaved={(id, instr) => setIntegrations(prev => prev.map(a => a.id === id ? { ...a, scanInstructions: instr } : a))}
          />

          {/* Ignored Senders */}
          <Card>
            <CardHeader><CardTitle>Ignored Senders &amp; Domains</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="email@example.com or domain.com"
                  value={newSender}
                  onChange={e => setNewSender(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addIgnoredSender()}
                />
                <Button onClick={addIgnoredSender} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {settings.ignoredSenders.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-md bg-paper px-3 py-2">
                  <span className="text-sm text-ink">{s.senderEmail || s.domain}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeIgnoredSender(s.id)}>
                    <Trash2 className="h-4 w-4 text-action" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          </>)}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <>
              <Card>
                <CardHeader><CardTitle>Daily Digest</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="digestEnabled"
                      checked={settings.digestSettings?.isEnabled ?? true}
                      onChange={e => setSettings(s => ({ ...s, digestSettings: { ...s.digestSettings!, isEnabled: e.target.checked } }))}
                      className="h-4 w-4 accent-action"
                    />
                    <label htmlFor="digestEnabled" className="text-sm font-medium text-ink">
                      Enable daily digest email
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Digest time</label>
                    <Input
                      type="time"
                      value={settings.digestSettings?.digestTime ?? '09:00'}
                      onChange={e => setSettings(s => ({ ...s, digestSettings: { ...s.digestSettings!, digestTime: e.target.value } }))}
                      className="w-32"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Chat &amp; messaging channels</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-[rgb(11_18_32/55%)]">
                    Slack, Microsoft Teams, and WhatsApp digest delivery now live in one place.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => { window.location.href = '/settings/connectors' }}
                  >
                    <Plug className="h-3.5 w-3.5" /> Manage in Connectors
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-[rgb(11_18_32/55%)]">
                    Get push notifications on this device when follow-ups are pending.
                  </p>
                  <PushNotificationToggle />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-action" />WatchList
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[rgb(11_18_32/55%)]">
                    Get a push on every email from a specific person, company, or thread — on top of Pendingly&apos;s regular alerts. Manage who and what you&apos;re watching from the dedicated WatchList page.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => { window.location.href = '/watchlist' }}
                  >
                    <Eye className="h-3.5 w-3.5" /> Open WatchList
                  </Button>
                </CardContent>
              </Card>

              {saveButton}
            </>
          )}

          {/* ── Automation ── */}
          {activeSection === 'automation' && (
            <>
              {/* Pause everything (vacation mode) */}
              <Card className={settings.appSettings?.automationPaused ? 'border-action/40 bg-[rgb(242_90_60/4%)]' : ''}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${settings.appSettings?.automationPaused ? 'bg-action/15 text-action' : 'bg-[rgb(11_18_32/6%)] text-[rgb(11_18_32/55%)]'}`}>
                      {settings.appSettings?.automationPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {settings.appSettings?.automationPaused ? 'Everything is paused' : 'Pause everything'}
                      </p>
                      <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5 max-w-md">
                        Going on vacation? One tap holds all automation — auto follow-ups, scheduled sends, snooze reminders, and digests. Scans keep running; nothing goes out until you resume.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={settings.appSettings?.automationPaused ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePause(!settings.appSettings?.automationPaused)}
                    className="shrink-0"
                  >
                    {settings.appSettings?.automationPaused ? 'Resume' : 'Pause all'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Follow-up Rules</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Default follow-up threshold (business days)
                    </label>
                    <Select
                      value={String(settings.appSettings?.defaultFollowupDays ?? 3)}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, defaultFollowupDays: parseInt(e.target.value) } }))}
                      className="w-32"
                    >
                      <option value="1">1 day</option>
                      <option value="2">2 days</option>
                      <option value="3">3 days</option>
                      <option value="5">5 days</option>
                      <option value="7">7 days</option>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <FollowupSequenceCard
                value={settings.appSettings?.followupSequenceJson ?? null}
                onChange={(v) => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, followupSequenceJson: v } }))}
              />

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-4 w-4 text-action" />Approval mode</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.appSettings?.followupApprovalMode ?? false}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, followupApprovalMode: e.target.checked } }))}
                      className="h-4 w-4 mt-0.5 accent-action"
                    />
                    <span>
                      <span className="text-sm font-medium text-ink">Approve every auto follow-up before it sends</span>
                      <span className="block text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                        Nothing goes out automatically. Pendingly drafts each follow-up and queues it on the{' '}
                        <a href="/approvals" className="underline hover:text-ink">Approvals</a> page for a one-tap send. Remember to Save.
                      </span>
                    </span>
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Automation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-[rgb(242_90_60/30%)] bg-[rgb(242_90_60/8%)] p-3 flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 text-action mt-0.5 shrink-0" />
                    <p className="text-xs text-ink">
                      Auto-follow-up will send emails on your behalf. Review your template carefully.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoFollowupEnabled"
                      checked={settings.appSettings?.autoFollowupEnabled ?? false}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, autoFollowupEnabled: e.target.checked } }))}
                      className="h-4 w-4 accent-action"
                    />
                    <label htmlFor="autoFollowupEnabled" className="text-sm font-medium text-ink">
                      Enable auto follow-up
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Days of silence before sending
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={settings.appSettings?.autoFollowupDays ?? 3}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, autoFollowupDays: parseInt(e.target.value) || 3 } }))}
                      className="w-32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Email template
                    </label>
                    <textarea
                      value={settings.appSettings?.autoFollowupTemplate ?? DEFAULT_FOLLOWUP_TEMPLATE}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, autoFollowupTemplate: e.target.value } }))}
                      rows={8}
                      className="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm text-ink"
                    />
                    <p className="text-xs text-[rgb(11_18_32/55%)] mt-1">
                      Available variables: {`{{name}}`}, {`{{firstName}}`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Calendar &amp; Reminders</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-[rgb(11_18_32/55%)]">
                    When you act on a follow-up, Pendingly can create a matching calendar event,
                    a task in Google Tasks / Microsoft To Do, or both.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Auto-create on new action items</label>
                    <select
                      value={settings.appSettings?.calendarAutoCreate ?? 'off'}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, calendarAutoCreate: e.target.value as 'off' | 'event' | 'task' | 'both' } }))}
                      className="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm"
                    >
                      <option value="off">Off — I&apos;ll add manually from each item</option>
                      <option value="event">Calendar event (uses item due date)</option>
                      <option value="task">Task (Google Tasks / MS To Do)</option>
                      <option value="both">Both event and task</option>
                    </select>
                    <p className="text-xs text-[rgb(11_18_32/55%)] mt-1">
                      Auto-create runs at scan time. You can always add or remove manually per item.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Default meeting link</label>
                    <select
                      value={settings.appSettings?.defaultMeetingProvider ?? 'none'}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, defaultMeetingProvider: e.target.value as 'none' | 'meet' | 'teams' | 'zoom' } }))}
                      className="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm"
                    >
                      <option value="none">No meeting link</option>
                      <option value="meet">Google Meet (Gmail accounts)</option>
                      <option value="teams">Microsoft Teams (Outlook accounts)</option>
                      <option value="zoom">Zoom (requires Zoom connector)</option>
                    </select>
                    <p className="text-xs text-[rgb(11_18_32/55%)] mt-1">
                      Pre-selected when creating events. Configure Zoom in{' '}
                      <a href="/settings/connectors" className="underline">Connectors</a>.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="reminderPushEnabled"
                      checked={settings.appSettings?.reminderPushEnabled ?? true}
                      onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, reminderPushEnabled: e.target.checked } }))}
                      className="h-4 w-4 accent-action"
                    />
                    <label htmlFor="reminderPushEnabled" className="text-sm font-medium text-ink">
                      Send a web push when a snoozed item wakes
                    </label>
                  </div>
                </CardContent>
              </Card>

              {saveButton}
            </>
          )}

          {/* ── AI ── */}
          {activeSection === 'ai' && (
            <>
              <AiProviderCard />
              <UsageCard />
            </>
          )}

          {/* ── Account ── */}
          {activeSection === 'account' && (
            <>
              <ProfileCard />

              <Card>
                <CardHeader><CardTitle>Email signature</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-3 p-3 bg-[rgb(11_18_32/4%)] rounded-lg mb-4 border border-[rgb(11_18_32/8%)]">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">Append &quot;Sent via Pendingly&quot;</p>
                      <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                        Adds a small footer to all outgoing emails. Disabled on Lite &amp; Pro plans.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.appSettings?.emailSignatureEnabled ?? true}
                        onChange={e => setSettings(s => ({ ...s, appSettings: { ...s.appSettings!, emailSignatureEnabled: e.target.checked } }))}
                        className="h-4 w-4 accent-action"
                        title="Toggle Pendingly email footer"
                      />
                      <a href="/upgrade" className="text-[10px] text-[rgb(11_18_32/35%)] underline hover:text-ink">Requires Lite/Pro to disable</a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[rgb(11_18_32/55%)]">
                      Custom signature — appended via the &quot;Insert signature&quot; button in the reply editor.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateSignature}
                      disabled={generatingSig}
                      className="shrink-0 ml-3 gap-1.5"
                      title="Generate signature using your profile & social links (Account → Profile)"
                    >
                      {generatingSig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {generatingSig ? 'Generating…' : 'Generate with Pendingly AI'}
                    </Button>
                  </div>
                  {sigGenError && (
                    <p className="text-xs text-red-600 mb-2">{sigGenError}</p>
                  )}
                  <RichTextEditor
                    value={settings.appSettings?.signatureHtml ?? ''}
                    onChange={(html) => setSettings(s => ({
                      ...s,
                      appSettings: s.appSettings
                        ? { ...s.appSettings, signatureHtml: html }
                        : { defaultFollowupDays: 3, scanWindowDays: 30, conservativeMode: true, signatureHtml: html },
                    }))}
                    placeholder="e.g. Best, Aritra — Founder @ Acme"
                    minHeight={120}
                  />
                  {saveButton}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Product Tour</CardTitle></CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" onClick={replayTour}>Replay tour</Button>
                  <p className="text-xs text-[rgb(11_18_32/55%)] mt-2">Walks you through how Pendingly works from the dashboard.</p>
                </CardContent>
              </Card>

              <Card className="border-[rgb(242_90_60/20%)]">
                <CardHeader><CardTitle className="text-action flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Danger Zone</CardTitle></CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={deleteAccount}>Delete Account &amp; All Data</Button>
                  <p className="text-xs text-[rgb(11_18_32/55%)] mt-2">This permanently deletes your account and all stored data. Cannot be undone.</p>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </main>

      {setupAccount && (
        <ScanSetupModal
          email={integrations.find(a => a.id === setupAccount.id)?.emailAddress ?? null}
          provider={setupAccount.provider}
          globalLevel={settings.appSettings?.noiseFilterLevel ?? 3}
          onStart={startSetupScan}
          onSkip={() => setSetupAccount(null)}
        />
      )}
    </>
  )
}

function ScanElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="font-mono tabular-nums">{m > 0 ? `${m}m ${s}s` : `${s}s`}</span>
}

function ScanSetupModal({
  email,
  provider,
  globalLevel,
  onStart,
  onSkip,
}: {
  email: string | null
  provider: string
  globalLevel: number
  onStart: (level: number, instructions: string) => Promise<void> | void
  onSkip: () => void
}) {
  const [level, setLevel] = useState(globalLevel)
  const [instructions, setInstructions] = useState('')
  const [starting, setStarting] = useState(false)
  const label = NOISE_LEVEL_LABELS[level]
  const providerName = provider === 'outlook' ? 'Outlook' : provider === 'gmail' ? 'Gmail' : provider

  const start = async () => {
    setStarting(true)
    try { await onStart(level, instructions) } finally { setStarting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30" onClick={starting ? undefined : onSkip} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-rule overflow-hidden">
        <div className="px-6 py-4 border-b border-rule">
          <h2 className="text-base font-semibold text-ink">Set up scan for your new inbox</h2>
          <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
            {email ? <span className="font-mono">{email}</span> : `${providerName} connected`} — choose how Pendingly should scan it before we start.
          </p>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Scan sensitivity */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Scan sensitivity</label>
            <p className="text-xs text-[rgb(11_18_32/55%)] mb-3">
              Controls how many automated emails are filtered out before Pendingly AI sees them. Lower = more emails scanned; higher = faster, fewer false positives.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  Level {level} — {NOISE_LEVEL_LABELS[level]?.name}
                </span>
                <span className="text-xs text-[rgb(11_18_32/40%)] font-mono">
                  {level === 1 ? 'least filtered' : level === 5 ? 'most filtered' : ''}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={level}
                onChange={e => setLevel(Number(e.target.value))}
                className="w-full accent-action"
              />
              <div className="flex justify-between text-[10px] text-[rgb(11_18_32/35%)] px-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={n === level ? 'text-action font-semibold' : ''}>
                    {NOISE_LEVEL_LABELS[n]?.name}
                  </span>
                ))}
              </div>
              {label && (
                <p className="text-xs text-[rgb(11_18_32/55%)] bg-paper-2 rounded-md px-3 py-2 border border-[rgb(11_18_32/8%)]">
                  {label.description}
                </p>
              )}
            </div>
          </div>

          {/* Instructions / prompt */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Scan instructions <span className="font-normal text-[rgb(11_18_32/45%)]">(optional)</span>
            </label>
            <p className="text-xs text-[rgb(11_18_32/55%)] mb-2.5">
              Teach Pendingly what matters in this inbox — e.g. &ldquo;Flag anything from clients about invoices&rdquo; or &ldquo;Ignore internal newsletters&rdquo;.
            </p>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Add any specific instructions for this inbox…"
              className="w-full text-sm border border-rule rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-action"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-rule flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={starting}>
            Skip for now
          </Button>
          <Button size="sm" onClick={start} disabled={starting}>
            {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Start scan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

type ProviderStatus = { hasKey: boolean; hasEnvFallback: boolean }
type AiConfigStatus = {
  preferredProvider: string | null
  providers: { anthropic: ProviderStatus; openai: ProviderStatus; gemini: ProviderStatus }
}

// costPerThread: estimated cost in USD per thread that reaches AI classification
// (~1,500 input tokens + ~200 output tokens per classify call)
const PROVIDER_META = {
  gemini:    { label: 'Google Gemini',  model: 'gemini-2.5-flash',      costPerThread: '$0.00018', placeholder: 'AIza...',     docs: 'https://aistudio.google.com/apikey',         note: 'Free tier available — get a key at Google AI Studio.' },
  anthropic: { label: 'Anthropic',      model: 'claude-sonnet-4-6',     costPerThread: '$0.0075',  placeholder: 'sk-ant-...',  docs: 'https://console.anthropic.com/settings/keys', note: 'Frontier-class model. Higher quality, higher cost.' },
  openai:    { label: 'OpenAI',         model: 'gpt-4o-mini',           costPerThread: '$0.00035', placeholder: 'sk-...',      docs: 'https://platform.openai.com/api-keys',        note: 'Fast and cost-effective.' },
} as const

type Provider = keyof typeof PROVIDER_META

interface UsageInfo {
  used: number
  limit: number
  percent: number
  exceeded: boolean
  resetAt: string
  planType: 'free' | 'lite' | 'pro'
  byType: Record<string, { default: number; byok: number }>
  byProvider: Record<string, { default: number; byok: number }>
  todayTotal: number
  todayByType: Record<string, { default: number; byok: number }>
  todayByProvider: Record<string, { default: number; byok: number }>
  range?: string
  rangeTotal?: number
  rangeByType?: Record<string, { default: number; byok: number }>
  rangeByProvider?: Record<string, { default: number; byok: number }>
}

const USAGE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 days' },
  { value: '30d',   label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all',   label: 'All time' },
]

function UsageCard() {
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [range, setRange] = useState('month')

  useEffect(() => {
    fetch(`/api/usage?range=${range}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setUsage(d) }).catch(() => {})
  }, [range])

  if (!usage) return null

  const unlimited = usage.limit === -1
  const resetLabel = usage.resetAt
    ? new Date(usage.resetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const rangeLabel = USAGE_RANGES.find(r => r.value === range)?.label ?? 'This month'

  const PROVIDER_LABELS: Record<string, string> = {
    google:    'Google Gemini',
    anthropic: 'Anthropic (Claude)',
    openai:    'OpenAI (GPT)',
    unknown:   'Unknown provider',
  }

  // Range-scoped breakdown data (falls back to monthly if API is older)
  const rangeByProvider = usage.rangeByProvider ?? usage.byProvider
  const rangeByType = usage.rangeByType ?? usage.byType
  const rangeTotal = usage.rangeTotal ?? Object.values(rangeByProvider).reduce((s, r) => s + r.default + r.byok, 0)

  // All providers seen in the selected range
  const allProviders = Object.keys(rangeByProvider).filter(p => {
    const r = rangeByProvider[p] || { default: 0, byok: 0 }
    return r.default + r.byok > 0
  })

  const monthlyTotal = Object.values(usage.byProvider).reduce((s, r) => s + r.default + r.byok, 0)
  const anyByok = Object.values(rangeByProvider).some(r => r.byok > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Pendingly AI usage</CardTitle>
        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          className="h-8 rounded-md border border-rule bg-white px-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-action"
          aria-label="Usage time range"
        >
          {USAGE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Today vs Month headline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[rgb(11_18_32/8%)] bg-paper p-3">
            <p className="text-[11px] text-[rgb(11_18_32/45%)] font-medium uppercase tracking-wider mb-1">Today</p>
            <p className="text-2xl font-bold text-ink">{usage.todayTotal.toLocaleString()}</p>
            <p className="text-[11px] text-[rgb(11_18_32/50%)] mt-0.5">API calls</p>
          </div>
          <div className="rounded-lg border border-[rgb(11_18_32/8%)] bg-paper p-3">
            <p className="text-[11px] text-[rgb(11_18_32/45%)] font-medium uppercase tracking-wider mb-1">This month</p>
            <p className="text-2xl font-bold text-ink">
              {monthlyTotal.toLocaleString()}
              {!unlimited && <span className="text-sm font-normal text-[rgb(11_18_32/40%)]"> / {usage.limit.toLocaleString()}</span>}
            </p>
            <p className="text-[11px] text-[rgb(11_18_32/50%)] mt-0.5">
              {unlimited ? 'Unlimited (Pro)' : `Resets ${resetLabel}`}
            </p>
          </div>
        </div>

        {/* Quota progress bar (non-Pro only) */}
        {!unlimited && usage.used > 0 && (
          <div>
            <div className="h-1.5 bg-[rgb(11_18_32/8%)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usage.exceeded ? 'bg-red-500' : usage.percent > 80 ? 'bg-amber-500' : 'bg-ink'}`}
                style={{ width: `${Math.min(usage.percent, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[rgb(11_18_32/45%)] mt-1 flex items-center justify-between">
              <span>{usage.percent}% of Pendingly-key quota used</span>
              <span>Plan: <span className="capitalize">{usage.planType}</span></span>
            </p>
          </div>
        )}

        {usage.exceeded && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-900">Monthly quota reached</p>
            <p className="text-xs text-red-800 mt-0.5">
              Scans and Pendingly AI suggestions are paused until {resetLabel}. <a href="/upgrade" className="underline font-medium">Upgrade</a> or add your own API key below.
            </p>
          </div>
        )}

        {/* Provider breakdown table — scoped to selected range */}
        {allProviders.length > 0 && (
          <div className="rounded-lg border border-[rgb(11_18_32/8%)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgb(11_18_32/6%)] bg-paper">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)]">Provider</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)]">{rangeLabel}</th>
                </tr>
              </thead>
              <tbody>
                {allProviders.map((p, i) => {
                  const r = rangeByProvider[p] || { default: 0, byok: 0 }
                  const isDefault = r.default > 0
                  return (
                    <tr key={p} className={i > 0 ? 'border-t border-[rgb(11_18_32/6%)]' : ''}>
                      <td className="px-3 py-2.5 text-ink font-medium">
                        {PROVIDER_LABELS[p] ?? p}
                        <span className="ml-1.5 text-[10px] text-[rgb(11_18_32/35%)] font-normal">
                          {isDefault && r.byok === 0 ? 'Pendingly key' : ''}
                          {!isDefault ? 'BYOK' : ''}
                          {isDefault && r.byok > 0 ? 'Pendingly + BYOK' : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-ink">
                        {(r.default + r.byok).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Call type breakdown — scoped to selected range */}
        <div className="rounded-lg border border-[rgb(11_18_32/8%)] p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)]">By call type — {rangeLabel.toLowerCase()}</p>
          {(() => {
            const rows = (['classify', 'suggest', 'draft'] as const).map(t => {
              const r = rangeByType[t] || { default: 0, byok: 0 }
              return { t, total: r.default + r.byok }
            }).filter(r => r.total > 0)
            if (rows.length === 0) return <p className="text-xs text-[rgb(11_18_32/40%)]">No Pendingly AI calls in this period.</p>
            return rows.map(({ t, total }) => (
              <div key={t} className="flex items-center justify-between text-xs">
                <span className="text-[rgb(11_18_32/65%)]">
                  {t === 'classify' ? 'Email classification' : t === 'suggest' ? 'Quick suggestions' : 'Full drafts'}
                </span>
                <span className="font-mono text-ink tabular-nums">{total.toLocaleString()}</span>
              </div>
            ))
          })()}
          <p className="text-[10px] text-[rgb(11_18_32/35%)] pt-1">{rangeTotal.toLocaleString()} total calls in {rangeLabel.toLowerCase()}</p>
        </div>

        {anyByok && (
          <p className="text-[11px] text-[rgb(11_18_32/45%)]">
            BYOK calls aren&apos;t metered against your plan — they bill directly to your provider account.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AiProviderCard() {
  const [config, setConfig] = useState<AiConfigStatus | null>(null)
  const [planType, setPlanType] = useState<'free' | 'lite' | 'pro' | null>(null)
  const [inputs, setInputs] = useState<Record<Provider, string>>({ gemini: '', anthropic: '', openai: '' })
  const [saving, setSaving] = useState<Provider | null>(null)
  const [removing, setRemoving] = useState<Provider | null>(null)
  const [errors, setErrors] = useState<Record<Provider, string | null>>({ gemini: null, anthropic: null, openai: null })
  const [saved, setSaved] = useState<Provider | null>(null)

  const refresh = () => {
    fetch('/api/user/ai-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConfig(d) })
      .catch(() => {})
    fetch('/api/plan')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.type) setPlanType(d.type) })
      .catch(() => {})
  }

  useEffect(() => { refresh() }, [])

  const byokAllowed = planType !== 'free'

  const saveKey = async (provider: Provider) => {
    const key = inputs[provider].trim()
    if (!key) return
    setSaving(provider)
    setErrors(e => ({ ...e, [provider]: null }))
    try {
      const res = await fetch('/api/user/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Save failed')
      }
      setInputs(i => ({ ...i, [provider]: '' }))
      setSaved(provider)
      setTimeout(() => setSaved(null), 2000)
      refresh()
    } catch (e) {
      setErrors(err => ({ ...err, [provider]: e instanceof Error ? e.message : 'Save failed' }))
    } finally {
      setSaving(null)
    }
  }

  const removeKey = async (provider: Provider) => {
    if (!confirm(`Remove your saved ${PROVIDER_META[provider].label} key?`)) return
    setRemoving(provider)
    await fetch('/api/user/ai-config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    setRemoving(null)
    refresh()
  }

  const setPreferred = async (provider: Provider | '') => {
    await fetch('/api/user/ai-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredProvider: provider || null }),
    })
    refresh()
  }

  const anyConfigured = config && (
    Object.values(config.providers).some(p => p.hasKey || p.hasEnvFallback)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendingly AI Provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-[rgb(11_18_32/55%)]">
          Pendingly AI classifies your threads, detects what needs a reply, and drafts responses.
          {byokAllowed
            ? ' Add a key for any provider to use your own quota. Otherwise Pendingly’s server key is used (subject to your plan limit).'
            : ' Bring-your-own API key is available on Lite and Pro plans.'}
        </p>

        {!byokAllowed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-900">BYOK is a paid feature</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Upgrade to Lite ($9) or Pro ($15) to save your own Anthropic, OpenAI, or Gemini key. {' '}
              <a href="/upgrade" className="underline font-medium">See plans</a>
            </p>
          </div>
        )}

        {config && anyConfigured && (
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Preferred provider</label>
            <select
              value={config.preferredProvider ?? ''}
              onChange={e => setPreferred(e.target.value as Provider | '')}
              className="text-xs rounded border border-[rgb(11_18_32/15%)] bg-white px-2.5 py-1.5 text-ink"
            >
              <option value="">Auto (uses first configured)</option>
              {(Object.keys(PROVIDER_META) as Provider[]).map(p => {
                const status = config.providers[p]
                if (!status.hasKey && !status.hasEnvFallback) return null
                return <option key={p} value={p}>{PROVIDER_META[p].label}</option>
              })}
            </select>
          </div>
        )}

        <div className="space-y-4">
          {(Object.keys(PROVIDER_META) as Provider[]).map(provider => {
            const meta = PROVIDER_META[provider]
            const status = config?.providers[provider]
            const isActive = config?.preferredProvider === provider || (!config?.preferredProvider && provider === 'gemini')
            return (
              <div key={provider} className={`rounded-lg border p-4 space-y-2.5 ${isActive && anyConfigured ? 'border-action/40 bg-action/[0.03]' : 'border-[rgb(11_18_32/8%)]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-ink">{meta.label}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgb(11_18_32/6%)] text-[rgb(11_18_32/50%)]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {meta.model}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgb(11_18_32/4%)] text-[rgb(11_18_32/40%)] border border-[rgb(11_18_32/8%)]" style={{ fontFamily: 'var(--font-mono)' }} title="Approximate cost per thread that reaches AI classification (~1,500 input + ~200 output tokens)">
                      ~{meta.costPerThread}/thread
                    </span>
                    {isActive && anyConfigured && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-action/10 text-action">Active</span>
                    )}
                  </div>
                  {status && (
                    <span className={`text-[11px] font-medium ${status.hasKey ? 'text-done' : status.hasEnvFallback ? 'text-[rgb(11_18_32/50%)]' : 'text-[rgb(11_18_32/30%)]'}`}>
                      {status.hasKey ? 'Key saved' : status.hasEnvFallback ? 'Server key' : 'Not configured'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[rgb(11_18_32/50%)]">{meta.note}</p>

                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={byokAllowed ? meta.placeholder : 'Upgrade to add your own key'}
                    value={inputs[provider]}
                    onChange={e => setInputs(i => ({ ...i, [provider]: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={!byokAllowed}
                  />
                  <Button
                    size="sm"
                    onClick={() => saveKey(provider)}
                    disabled={!byokAllowed || saving === provider || !inputs[provider].trim()}
                  >
                    {saved === provider ? 'Saved!' : saving === provider ? 'Saving…' : status?.hasKey ? 'Replace' : 'Save'}
                  </Button>
                </div>
                {errors[provider] && <p className="text-xs text-action">{errors[provider]}</p>}

                <div className="flex items-center gap-3">
                  <a
                    href={meta.docs}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[rgb(11_18_32/50%)] hover:text-ink underline transition-colors"
                  >
                    Get a key ↗
                  </a>
                  {status?.hasKey && (
                    <button
                      type="button"
                      onClick={() => removeKey(provider)}
                      disabled={removing === provider}
                      className="text-[11px] text-action hover:underline disabled:opacity-50"
                    >
                      {removing === provider ? 'Removing…' : 'Remove key'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Scope selector shared by the Scan Aggressiveness and Teach Pendingly cards.
// "all" edits the global default; an inbox id edits that inbox's override.
function ScopeSelect({
  scope,
  setScope,
  inboxes,
}: {
  scope: string
  setScope: (v: string) => void
  inboxes: EmailAccount[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedLabel = scope === 'all'
    ? 'All inboxes (default)'
    : (inboxes.find(i => i.id === scope)?.emailAddress ?? 'Unknown inbox')

  const initials = (email: string) => email.slice(0, 2).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)] mb-1.5">
        Applies to
      </p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-9 w-full max-w-sm items-center justify-between gap-2 rounded-lg border border-[rgb(11_18_32/12%)] bg-white px-3 text-sm text-ink shadow-sm hover:border-[rgb(11_18_32/22%)] hover:bg-[rgb(11_18_32/2%)] transition-colors focus:outline-none focus:ring-2 focus:ring-action/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          {scope === 'all' ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(11_18_32/8%)]">
              <svg className="h-3 w-3 text-[rgb(11_18_32/55%)]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 8a5 5 0 1 1 10 0A5 5 0 0 1 3 8zm5-6.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5zM5 8a3 3 0 1 1 6 0A3 3 0 0 1 5 8z" />
              </svg>
            </span>
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-action text-[9px] font-bold text-white">
              {initials(selectedLabel)}
            </span>
          )}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[rgb(11_18_32/35%)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full max-w-sm rounded-xl border border-[rgb(11_18_32/10%)] bg-white shadow-lg overflow-hidden">
          <div className="px-2 py-1.5">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/35%)]">Applies to</p>
            <button
              type="button"
              role="option"
              aria-selected={scope === 'all'}
              onClick={() => { setScope('all'); setOpen(false) }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${scope === 'all' ? 'bg-[rgb(11_18_32/6%)] text-ink font-medium' : 'text-[rgb(11_18_32/70%)] hover:bg-[rgb(11_18_32/4%)] hover:text-ink'}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(11_18_32/8%)]">
                <svg className="h-3.5 w-3.5 text-[rgb(11_18_32/55%)]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 8a5 5 0 1 1 10 0A5 5 0 0 1 3 8zm5-6.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5zM5 8a3 3 0 1 1 6 0A3 3 0 0 1 5 8z" />
                </svg>
              </span>
              <span className="truncate">All inboxes</span>
              {scope === 'all' && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-action" />}
            </button>

            {inboxes.length > 0 && (
              <>
                <div className="mx-2 my-1 border-t border-[rgb(11_18_32/6%)]" />
                <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/35%)]">Specific inbox</p>
                {inboxes.map(inbox => (
                  <button
                    key={inbox.id}
                    type="button"
                    role="option"
                    aria-selected={scope === inbox.id}
                    onClick={() => { setScope(inbox.id); setOpen(false) }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${scope === inbox.id ? 'bg-[rgb(11_18_32/6%)] text-ink font-medium' : 'text-[rgb(11_18_32/70%)] hover:bg-[rgb(11_18_32/4%)] hover:text-ink'}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-action text-[9px] font-bold text-white">
                      {initials(inbox.emailAddress)}
                    </span>
                    <span className="truncate">{inbox.emailAddress}</span>
                    {scope === inbox.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-action" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ScanAggressivenessCard({
  globalLevel,
  onGlobalLevelChange,
  onSaveGlobal,
  savingGlobal,
  savedGlobal,
  inboxes,
  onInboxSaved,
}: {
  globalLevel: number
  onGlobalLevelChange: (n: number) => void
  onSaveGlobal: () => void
  savingGlobal: boolean
  savedGlobal: boolean
  inboxes: EmailAccount[]
  onInboxSaved: (id: string, level: number | null) => void
}) {
  const [scope, setScope] = useState<string>('all')
  const selectedInbox = inboxes.find(i => i.id === scope) ?? null

  // 0 = inherit global, 1–5 = explicit per-inbox override
  const [inboxLevel, setInboxLevel] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  useEffect(() => {
    if (selectedInbox) setInboxLevel(selectedInbox.noiseFilterLevel ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const isInheriting = inboxLevel === 0
  // Slider always shows a real 1–5 value; when inheriting, mirror the global level
  const displayLevel = scope === 'all' ? globalLevel : (isInheriting ? globalLevel : inboxLevel)
  const dirty = (inboxLevel === 0 ? null : inboxLevel) !== (selectedInbox?.noiseFilterLevel ?? null)

  const saveInbox = async () => {
    if (!selectedInbox) return
    setSaving(true)
    try {
      const payload = { noiseFilterLevel: inboxLevel === 0 ? null : inboxLevel }
      const res = await fetch(`/api/integrations/${selectedInbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onInboxSaved(selectedInbox.id, payload.noiseFilterLevel)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  // Save global level and clear all per-inbox overrides so every inbox inherits
  const handleSaveGlobal = async () => {
    setClearingAll(true)
    try {
      await onSaveGlobal()
      await Promise.all(inboxes.map(async inbox => {
        if (inbox.noiseFilterLevel !== null) {
          await fetch(`/api/integrations/${inbox.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noiseFilterLevel: null }),
          }).catch(() => {})
          onInboxSaved(inbox.id, null)
        }
      }))
      if (scope !== 'all') setInboxLevel(0)
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Scan Aggressiveness</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[rgb(11_18_32/55%)]">
          Controls how many automated emails are discarded before Pendingly AI sees them. Lower = more emails scanned, higher = faster scans with fewer false positives.
        </p>

        {inboxes.length > 0 && <ScopeSelect scope={scope} setScope={setScope} inboxes={inboxes} />}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">
              Level {displayLevel} — {NOISE_LEVEL_LABELS[displayLevel]?.name}
            </span>
            <div className="flex items-center gap-2">
              {scope !== 'all' && isInheriting && (
                <span className="text-[11px] bg-[rgb(11_18_32/6%)] text-[rgb(11_18_32/50%)] px-2 py-0.5 rounded-full">
                  Using global default
                </span>
              )}
              {scope !== 'all' && !isInheriting && (
                <button
                  type="button"
                  onClick={() => setInboxLevel(0)}
                  className="text-[11px] text-action hover:underline"
                >
                  Reset to global
                </button>
              )}
              <span className="text-xs text-[rgb(11_18_32/40%)] font-mono">
                {displayLevel === 1 ? 'least filtered' : displayLevel === 5 ? 'most filtered' : ''}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={displayLevel}
            onChange={e => {
              const n = Number(e.target.value)
              if (scope === 'all') onGlobalLevelChange(n)
              else setInboxLevel(n)
            }}
            className="w-full accent-action"
          />
          <div className="flex justify-between text-[10px] text-[rgb(11_18_32/35%)] px-0.5">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={n === displayLevel ? 'text-action font-semibold' : ''}>
                {NOISE_LEVEL_LABELS[n]?.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-[rgb(11_18_32/55%)] bg-paper-2 rounded-md px-3 py-2 border border-[rgb(11_18_32/8%)]">
            {scope !== 'all' && isInheriting
              ? `Inheriting the global default — ${NOISE_LEVEL_LABELS[globalLevel]?.description}`
              : NOISE_LEVEL_LABELS[displayLevel]?.description}
          </p>
        </div>

        {scope === 'all' ? (
          <>
            <p className="text-xs text-[rgb(11_18_32/40%)]">
              Takes effect on the next sync. Saving will reset any per-inbox overrides so all inboxes inherit this level.
            </p>
            <Button onClick={handleSaveGlobal} disabled={savingGlobal || clearingAll} size="sm">
              {savedGlobal ? 'Saved!' : (savingGlobal || clearingAll) ? 'Saving…' : 'Save Settings'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-[rgb(11_18_32/40%)]">
              {isInheriting
                ? `Move the slider to set a custom level for ${selectedInbox?.emailAddress} only.`
                : `Overrides the global default for ${selectedInbox?.emailAddress} only. Takes effect on the next sync.`}
            </p>
            <Button onClick={saveInbox} disabled={saving || !dirty} size="sm">
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save inbox settings'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TeachPendinglyCard({
  globalValue,
  onGlobalChange,
  onSaveGlobal,
  savingGlobal,
  savedGlobal,
  inboxes,
  onInboxSaved,
}: {
  globalValue: string
  onGlobalChange: (v: string) => void
  onSaveGlobal: () => void
  savingGlobal: boolean
  savedGlobal: boolean
  inboxes: EmailAccount[]
  onInboxSaved: (id: string, instructions: string | null) => void
}) {
  const [scope, setScope] = useState<string>('all')
  const selectedInbox = inboxes.find(i => i.id === scope) ?? null

  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  useEffect(() => {
    if (selectedInbox) setInstructions(selectedInbox.scanInstructions ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const dirty = (instructions.trim() || null) !== (selectedInbox?.scanInstructions ?? null)

  const saveInbox = async () => {
    if (!selectedInbox) return
    setSaving(true)
    try {
      const payload = { scanInstructions: instructions.trim() || null }
      const res = await fetch(`/api/integrations/${selectedInbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onInboxSaved(selectedInbox.id, payload.scanInstructions)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  // Save global instructions and clear all per-inbox overrides so every inbox inherits
  const handleSaveGlobal = async () => {
    setClearingAll(true)
    try {
      await onSaveGlobal()
      await Promise.all(inboxes.map(async inbox => {
        if (inbox.scanInstructions !== null && inbox.scanInstructions !== undefined) {
          await fetch(`/api/integrations/${inbox.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanInstructions: null }),
          }).catch(() => {})
          onInboxSaved(inbox.id, null)
        }
      }))
      if (scope !== 'all') setInstructions('')
    } finally {
      setClearingAll(false)
    }
  }

  const globalPlaceholder = `Examples of what you can write:

• I work in B2B sales. Always flag emails from prospects and clients asking about pricing or demos as high priority.
• Ignore all internal HR emails except interview scheduling.
• I'm a freelancer. "Waiting on them" should be set when I've sent a proposal and haven't heard back for 2+ days.
• Flag any email where someone mentions a deadline or says "by EOD" or "by Friday".
• Don't flag emails from noreply@notion.so — those are auto-generated.`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teach Pendingly</CardTitle>
        <p className="text-xs text-[rgb(11_18_32/55%)] mt-1">
          Tell Pendingly AI how to classify emails for your specific context. These instructions are injected into every scan on top of the built-in rules and the Scan Aggressiveness setting above.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {inboxes.length > 0 && <ScopeSelect scope={scope} setScope={setScope} inboxes={inboxes} />}

        {scope === 'all' ? (
          <>
            <textarea
              value={globalValue}
              onChange={e => onGlobalChange(e.target.value)}
              maxLength={2000}
              rows={7}
              placeholder={globalPlaceholder}
              className="w-full rounded-lg border border-rule bg-paper px-3.5 py-3 text-sm text-ink placeholder:text-[rgb(11_18_32/30%)] focus:outline-none focus:ring-1 focus:ring-action resize-y font-[inherit] leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[rgb(11_18_32/40%)]">
                {globalValue.length}/2000 characters · saving will clear any per-inbox overrides
              </p>
              <Button onClick={handleSaveGlobal} disabled={savingGlobal || clearingAll} size="sm">
                {savedGlobal ? 'Saved!' : (savingGlobal || clearingAll) ? 'Saving…' : 'Save instructions'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Extra instructions for this inbox only — added on top of the global Teach Pendingly instructions. e.g. 'This is my work account, prioritise client emails' or 'Ignore newsletters here.'"
              className="w-full rounded-lg border border-rule bg-white px-3.5 py-3 text-sm text-ink placeholder:text-[rgb(11_18_32/30%)] focus:outline-none focus:ring-1 focus:ring-action resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[rgb(11_18_32/40%)]">
                {instructions.length}/2000 characters · applies to <span className="font-medium text-ink">{selectedInbox?.emailAddress}</span> only
              </p>
              <Button onClick={saveInbox} disabled={saving || !dirty} size="sm">
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save inbox settings'}
              </Button>
            </div>
          </>
        )}

        <div className="rounded-lg border border-[rgb(11_18_32/8%)] bg-paper p-3.5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)]">How it works</p>
          <ul className="text-xs text-[rgb(11_18_32/60%)] space-y-1 list-disc list-inside">
            <li>Instructions are appended to Pendingly AI&apos;s classification prompt on every scan.</li>
            <li>Inbox-specific instructions are added on top of the global ones for that inbox.</li>
            <li>Built-in rules (spam detection, category logic) are preserved — instructions add nuance, not override.</li>
            <li>Changes take effect on the next scan run.</li>
            <li>Pendingly AI cannot be instructed by content embedded inside emails — only prompts in this box apply.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function WebmailUrlField({
  account,
  onSaved,
}: {
  account: EmailAccount
  onSaved: (url: string | null, template: string | null) => void
}) {
  const defaultTemplate = account.provider === 'zoho'
    ? 'https://mail.zoho.com/zm/#search/nq={q}'
    : ''

  const [baseUrl, setBaseUrl] = useState(account.webmailBaseUrl || '')
  const [template, setTemplate] = useState(account.webmailSearchUrlTemplate || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeholderForBase = (provider: string) => {
    if (provider === 'zoho') return 'https://mail.zoho.com'
    if (provider === 'apple') return 'https://www.icloud.com/mail'
    return 'https://mail.your-domain.com'
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webmailBaseUrl: baseUrl.trim() || null,
          webmailSearchUrlTemplate: template.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onSaved(data.webmailBaseUrl ?? null, data.webmailSearchUrlTemplate ?? null)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const testSearch = () => {
    if (!template.trim()) return
    const encoded = encodeURIComponent('Pendingly test')
    const url = template.includes('{q}')
      ? template.replace(/\{q\}/g, encoded)
      : template.includes('{query}')
        ? template.replace(/\{query\}/g, encoded)
        : template + encoded
    window.open(url, '_blank')
  }

  return (
    <div className="mt-3 pt-3 border-t border-[rgb(11_18_32/8%)] space-y-3">
      <div>
        <label className="block text-xs font-medium text-ink mb-1">Webmail URL</label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={placeholderForBase(account.provider)}
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-[rgb(11_18_32/50%)] mt-1">
          Where you check this account in a browser. Used by the global "Open Inbox" button.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink mb-1">
          Search URL template <span className="font-normal text-[rgb(11_18_32/50%)]">(optional, for per-thread "Open")</span>
        </label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={defaultTemplate || 'https://your-webmail.com/search?q={q}'}
            value={template}
            onChange={e => setTemplate(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={testSearch} disabled={!template.trim()}>
            Test
          </Button>
        </div>
        <p className="text-[11px] text-[rgb(11_18_32/50%)] mt-1">
          Use <code className="px-1 py-0.5 bg-paper-2 rounded text-[10px]">{'{q}'}</code> where the
          thread subject goes. Click Test to verify the URL opens a search in your webmail.
          {account.provider === 'zoho' && !template && (
            <> Suggested default: <button type="button" onClick={() => setTemplate(defaultTemplate)} className="underline text-action">use Zoho default</button>.</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </Button>
        {error && <span className="text-xs text-action">{error}</span>}
        {saved && (
          <span className="text-[11px] text-[rgb(11_18_32/50%)]">
            Re-run a scan to update existing thread links.
          </span>
        )}
      </div>
    </div>
  )
}

interface SequenceStep { dayOffset: number; tone: string; template: string }

function FollowupSequenceCard({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const parsed: SequenceStep[] = (() => {
    if (!value) return []
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : [] } catch { return [] }
  })()
  const [steps, setSteps] = useState<SequenceStep[]>(parsed)
  const [enabled, setEnabled] = useState(parsed.length > 0)

  const sync = (next: SequenceStep[]) => {
    setSteps(next)
    onChange(next.length > 0 ? JSON.stringify(next) : null)
  }

  const addStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].dayOffset : 0
    sync([...steps, { dayOffset: lastDay + 3, tone: 'polite', template: 'Hi {{name}},\n\nJust circling back on this — let me know if I can help.\n\nThanks' }])
  }
  const removeStep = (idx: number) => sync(steps.filter((_, i) => i !== idx))
  const updateStep = (idx: number, patch: Partial<SequenceStep>) =>
    sync(steps.map((s, i) => i === idx ? { ...s, ...patch } : s))

  return (
    <Card>
      <CardHeader><CardTitle>Follow-up sequence</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[rgb(11_18_32/55%)]">
          Send multiple follow-ups with different tones if you still don&apos;t hear back.
          Overrides the single-step auto-follow-up below when enabled.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sequenceEnabled"
            checked={enabled}
            onChange={e => {
              setEnabled(e.target.checked)
              if (!e.target.checked) sync([])
              else if (steps.length === 0) addStep()
            }}
            className="h-4 w-4 accent-action"
          />
          <label htmlFor="sequenceEnabled" className="text-sm font-medium text-ink">
            Enable multi-step sequence
          </label>
        </div>
        {enabled && (
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="border border-rule rounded-md p-3 space-y-2 bg-paper-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink">Step {i + 1}</p>
                  <button onClick={() => removeStep(i)} className="text-xs text-action hover:underline">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[rgb(11_18_32/55%)] mb-1">Day after last activity</label>
                    <Input
                      type="number" min={1} max={90}
                      value={step.dayOffset}
                      onChange={e => updateStep(i, { dayOffset: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[rgb(11_18_32/55%)] mb-1">Tone</label>
                    <select
                      value={step.tone}
                      onChange={e => updateStep(i, { tone: e.target.value })}
                      className="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm"
                    >
                      <option value="polite">Polite</option>
                      <option value="firm">Firm</option>
                      <option value="short">Short</option>
                      <option value="executive">Executive</option>
                      <option value="friendly">Friendly</option>
                      <option value="final">Final reminder</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[rgb(11_18_32/55%)] mb-1">Template</label>
                  <textarea
                    value={step.template}
                    onChange={e => updateStep(i, { template: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
            <button onClick={addStep} className="text-xs text-ink border border-rule rounded-md px-3 py-1.5 hover:bg-paper-2">
              + Add step
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const CROP_SIZE = 280
const OUTPUT_SIZE = 256

function AvatarCropModal({ src, onSave, onCancel }: {
  src: string
  onSave: (dataUrl: string) => void
  onCancel: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startOX: 0, startOY: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const { w: nw, h: nh } = naturalSize
  const swapped = rotation === 90 || rotation === 270
  // Effective dimensions as they appear after rotation
  const effW = swapped ? nh : nw
  const effH = swapped ? nw : nh
  // baseScale fits the image to COVER the circle at zoom = 1 (no distortion —
  // width & height are scaled by the same factor)
  const baseScale = effW > 0 ? Math.max(CROP_SIZE / effW, CROP_SIZE / effH) : 1
  const scale = baseScale * zoom

  // How far the image may pan before an edge enters the circle
  const maxX = Math.max(0, (effW * scale - CROP_SIZE) / 2)
  const maxY = Math.max(0, (effH * scale - CROP_SIZE) / 2)
  const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v))

  // Re-clamp the pan whenever zoom/rotation shrink the allowed range
  useEffect(() => {
    setOffset(o => ({ x: clamp(o.x, maxX), y: clamp(o.y, maxY) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, rotation, nw, nh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.max(1, Math.min(4, z * (1 - e.deltaY * 0.0015))))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    containerRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startOX: offset.x, startOY: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    const { startX, startY, startOX, startOY } = dragRef.current
    setOffset({
      x: clamp(startOX + e.clientX - startX, maxX),
      y: clamp(startOY + e.clientY - startY, maxY),
    })
  }
  const onPointerUp = () => { dragRef.current.active = false }

  const handleRotate = () => {
    setRotation(r => (r + 90) % 360)
    setOffset({ x: 0, y: 0 })
  }

  const handleSave = () => {
    const img = imgRef.current
    if (!img || !img.complete || nw === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')!
    const ratio = OUTPUT_SIZE / CROP_SIZE
    // Mirror the exact CSS transform used in the preview
    ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale * ratio, scale * ratio)
    ctx.drawImage(img, -nw / 2, -nh / 2)
    onSave(canvas.toDataURL('image/jpeg', 0.9))
  }

  // CSS transform: centre the image on the circle centre, then rotate, scale & pan.
  // transform-origin 0 0 keeps the maths identical to the canvas export above.
  const transform = `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale}) translate(${-nw / 2}px, ${-nh / 2}px)`

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgb(11_18_32/8%)]">
          <p className="text-sm font-semibold text-ink">Edit profile photo</p>
          <p className="text-xs text-[rgb(11_18_32/45%)] mt-0.5">Drag to reposition · scroll or slider to zoom</p>
        </div>

        <div className="px-5 py-5 flex flex-col items-center gap-4">
          {/* Circular crop preview */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing select-none bg-[rgb(11_18_32/6%)]"
            style={{ width: CROP_SIZE, height: CROP_SIZE, touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={e => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                position: 'absolute',
                left: CROP_SIZE / 2,
                top: CROP_SIZE / 2,
                width: nw || undefined,
                height: nh || undefined,
                transform,
                transformOrigin: '0 0',
                visibility: nw > 0 ? 'visible' : 'hidden',
                userSelect: 'none',
                pointerEvents: 'none',
                maxWidth: 'none',
              }}
            />
            {/* subtle ring */}
            <div className="absolute inset-0 rounded-full pointer-events-none ring-2 ring-inset ring-white/30" />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 w-full px-1">
            <span className="text-base text-[rgb(11_18_32/35%)] leading-none select-none font-light">−</span>
            <input
              type="range" min={1} max={4} step={0.01} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-action h-1"
            />
            <span className="text-base text-[rgb(11_18_32/35%)] leading-none select-none font-light">+</span>
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center justify-between">
          <button
            onClick={handleRotate}
            className="flex items-center gap-1.5 text-sm text-[rgb(11_18_32/55%)] hover:text-ink transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Rotate 90°
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={nw === 0}>Apply</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProfileData {
  id: string
  name: string | null
  email: string
  image: string | null
  timezone: string
  designation: string | null
  company: string | null
  phone: string | null
  createdAt: string
  socialLinkedin: string | null
  socialTwitter: string | null
  socialInstagram: string | null
  socialFacebook: string | null
  socialSnapchat: string | null
}

const PROFILE_CACHE_KEY = 'pendingly_profile'

function ProfileCard() {
  const [data, setData] = useState<ProfileData | null>(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const [name, setName] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? (JSON.parse(cached) as ProfileData).name ?? '' : ''
    } catch { return '' }
  })
  const [timezone, setTimezone] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? (JSON.parse(cached) as ProfileData).timezone : ''
    } catch { return '' }
  })
  const [designation, setDesignation] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? (JSON.parse(cached) as ProfileData).designation ?? '' : ''
    } catch { return '' }
  })
  const [company, setCompany] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? (JSON.parse(cached) as ProfileData).company ?? '' : ''
    } catch { return '' }
  })
  const [phone, setPhone] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      const p = cached ? (JSON.parse(cached) as ProfileData).phone ?? '' : ''
      const match = p.match(/^(\+\d+)\s(.*)$/)
      return match ? match[2] : p
    } catch { return '' }
  })
  const [phoneCC, setPhoneCC] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      const p = cached ? (JSON.parse(cached) as ProfileData).phone ?? '' : ''
      const match = p.match(/^(\+\d+)\s(.*)$/)
      return match ? match[1] : '+91'
    } catch { return '+91' }
  })
  const [socialLinkedin, setSocialLinkedin] = useState(() => {
    try { const c = localStorage.getItem(PROFILE_CACHE_KEY); return c ? (JSON.parse(c) as ProfileData).socialLinkedin ?? '' : '' } catch { return '' }
  })
  const [socialTwitter, setSocialTwitter] = useState(() => {
    try { const c = localStorage.getItem(PROFILE_CACHE_KEY); return c ? (JSON.parse(c) as ProfileData).socialTwitter ?? '' : '' } catch { return '' }
  })
  const [socialInstagram, setSocialInstagram] = useState(() => {
    try { const c = localStorage.getItem(PROFILE_CACHE_KEY); return c ? (JSON.parse(c) as ProfileData).socialInstagram ?? '' : '' } catch { return '' }
  })
  const [socialFacebook, setSocialFacebook] = useState(() => {
    try { const c = localStorage.getItem(PROFILE_CACHE_KEY); return c ? (JSON.parse(c) as ProfileData).socialFacebook ?? '' : '' } catch { return '' }
  })
  const [socialSnapchat, setSocialSnapchat] = useState(() => {
    try { const c = localStorage.getItem(PROFILE_CACHE_KEY); return c ? (JSON.parse(c) as ProfileData).socialSnapchat ?? '' : '' } catch { return '' }
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.ok ? r.json() : null)
      .then((d: ProfileData | null) => {
        if (!d) return
        try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(d)) } catch {}
        setData(d)
        setName(d.name ?? '')
        setTimezone(d.timezone)
        setDesignation(d.designation ?? '')
        setCompany(d.company ?? '')
        const match = (d.phone ?? '').match(/^(\+\d+)\s(.*)$/)
        if (match) { setPhoneCC(match[1]); setPhone(match[2]) }
        else if (d.phone) setPhone(d.phone)
        setSocialLinkedin(d.socialLinkedin ?? '')
        setSocialTwitter(d.socialTwitter ?? '')
        setSocialInstagram(d.socialInstagram ?? '')
        setSocialFacebook(d.socialFacebook ?? '')
        setSocialSnapchat(d.socialSnapchat ?? '')
      })
      .catch(() => {})
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => { if (typeof ev.target?.result === 'string') setCropSrc(ev.target.result) }
    reader.readAsDataURL(file)
  }

  const handleCropSave = async (dataUrl: string) => {
    setCropSrc(null)
    setAvatarUploading(true)
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl }),
      })
      if (res.ok && data) {
        const updated = { ...data, image: dataUrl }
        try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated)) } catch {}
        setData(updated)
      }
    } finally {
      setAvatarUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const fullPhone = phone.trim() ? `${phoneCC} ${phone.trim()}` : ''
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, timezone, designation, company, phone: fullPhone, socialLinkedin, socialTwitter, socialInstagram, socialFacebook, socialSnapchat }),
      })
      if (data) {
        const updated = { ...data, name, timezone, designation, company, phone: fullPhone || null, socialLinkedin: socialLinkedin || null, socialTwitter: socialTwitter || null, socialInstagram: socialInstagram || null, socialFacebook: socialFacebook || null, socialSnapchat: socialSnapchat || null }
        try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated)) } catch {}
        setData(updated)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const fullPhone = phone.trim() ? `${phoneCC} ${phone.trim()}` : ''
  const dirty = data && (
    name !== (data.name ?? '') ||
    timezone !== data.timezone ||
    designation !== (data.designation ?? '') ||
    company !== (data.company ?? '') ||
    fullPhone !== (data.phone ?? '') ||
    socialLinkedin !== (data.socialLinkedin ?? '') ||
    socialTwitter !== (data.socialTwitter ?? '') ||
    socialInstagram !== (data.socialInstagram ?? '') ||
    socialFacebook !== (data.socialFacebook ?? '') ||
    socialSnapchat !== (data.socialSnapchat ?? '')
  )

  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <p className="text-sm text-[rgb(11_18_32/55%)]">Loading…</p>
        ) : (
          <>
            {cropSrc && (
              <AvatarCropModal src={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />
            )}
            <div className="flex items-center gap-4">
              {/* Clickable avatar with camera overlay */}
              <div className="relative group shrink-0 h-14 w-14">
                {data.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={data.image} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-paper-2 border border-rule flex items-center justify-center text-base font-semibold text-ink">
                    {(data.name || data.email).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  title="Change profile photo"
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {avatarUploading
                    ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                    : <Camera className="h-4 w-4 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{data.email}</p>
                <p className="text-[11px] text-[rgb(11_18_32/50%)]">
                  Member since {new Date(data.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign out
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Display name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Designation</label>
                <Input
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Founder, Sales Lead"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Company</label>
                <Input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Acme Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Phone</label>
                <div className="flex gap-1.5">
                  <select
                    value={phoneCC}
                    onChange={e => setPhoneCC(e.target.value)}
                    className="rounded-md border border-rule bg-white px-2 py-2 text-sm text-ink w-24 shrink-0"
                  >
                    {['+91','+1','+44','+61','+65','+971','+81','+86','+49','+33','+7','+55','+27','+234','+60'].map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                  </select>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm text-ink"
              >
                {!COMMON_TIMEZONES.includes(timezone) && timezone && (
                  <option value={timezone}>{timezone}</option>
                )}
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-[11px] text-[rgb(11_18_32/50%)] mt-1">
                Affects digest delivery, scheduling, and snooze wake times.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-ink mb-2">Social Media</p>
              <p className="text-[11px] text-[rgb(11_18_32/50%)] mb-3">Used to generate your email signature. Enter a full URL or just your username/handle.</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'LinkedIn', value: socialLinkedin, set: setSocialLinkedin, placeholder: 'linkedin.com/in/yourname' },
                  { label: 'Twitter / X', value: socialTwitter, set: setSocialTwitter, placeholder: '@handle or URL' },
                  { label: 'Instagram', value: socialInstagram, set: setSocialInstagram, placeholder: '@handle or URL' },
                  { label: 'Facebook', value: socialFacebook, set: setSocialFacebook, placeholder: 'facebook.com/yourname' },
                  { label: 'Snapchat', value: socialSnapchat, set: setSocialSnapchat, placeholder: '@username' },
                ] as Array<{ label: string; value: string; set: (v: string) => void; placeholder: string }>).map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-[rgb(11_18_32/55%)] mb-1">{label}</label>
                    <Input
                      type="text"
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {dirty && (
              <Button onClick={save} disabled={saving} size="sm">
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save profile'}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SyncAllButton({ integrations, onStarted, onSyncStart }: { integrations: EmailAccount[]; onStarted?: () => void; onSyncStart?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const syncAll = async (forceFullRescan = false) => {
    setMenuOpen(false)
    if (forceFullRescan && !confirm(
      `Reset scan history for all ${integrations.length} inboxes?\n\nRe-evaluates every email in the scan window from scratch.\n\nExisting action items are NOT deleted.`
    )) return
    setBusy(true); setDone(false)
    onSyncStart?.()
    try {
      await Promise.all(integrations.map(a =>
        fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: a.id, ...(forceFullRescan ? { force_full_rescan: true } : {}) }),
        })
      ))
      setDone(true)
      setTimeout(() => setDone(false), 4000)
      onStarted?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={menuRef} className="relative flex items-center">
      <Button variant="outline" size="sm" onClick={() => syncAll(false)} disabled={busy} className="rounded-r-none border-r-0 pr-2.5">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : done ? <Check className="h-3.5 w-3.5 mr-1 text-done" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
        {done ? 'Queued' : `Sync all (${integrations.length})`}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setMenuOpen(o => !o)} disabled={busy} className="rounded-l-none px-1.5 border-l border-[rgb(11_18_32/15%)]">
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[rgb(11_18_32/12%)] rounded-lg shadow-lg w-64 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/35%)]">All inboxes</p>
          </div>
          <button onClick={() => syncAll(false)} className="w-full text-left px-3 py-2 hover:bg-paper-2 transition-colors">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-[rgb(11_18_32/45%)]" />
              <div>
                <p className="text-sm font-medium text-ink">Sync all now</p>
                <p className="text-[11px] text-[rgb(11_18_32/45%)]">Fetch only new emails across all inboxes</p>
              </div>
            </div>
          </button>
          <div className="mx-3 border-t border-[rgb(11_18_32/8%)]" />
          <button onClick={() => syncAll(true)} className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700">Reset &amp; rescan all</p>
                <p className="text-[11px] text-amber-600/70">Re-evaluate every email from scratch</p>
              </div>
            </div>
          </button>
          <div className="px-3 pb-2.5 pt-1">
            <p className="text-[10px] text-[rgb(11_18_32/35%)]">Existing action items are not deleted</p>
          </div>
        </div>
      )}
    </div>
  )
}

function InboxSyncButton({ accountId, scanning, onCancelled, onStarted, onSyncStart }: { accountId: string; scanning?: boolean; onCancelled?: () => void; onStarted?: () => void; onSyncStart?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const sync = async (forceFullRescan = false) => {
    setBusy(true); setError(null); setDone(false); setMenuOpen(false)
    onSyncStart?.()
    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, ...(forceFullRescan ? { force_full_rescan: true } : {}) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Sync failed')
      onStarted?.()
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
      setTimeout(() => setError(null), 4000)
    } finally {
      setBusy(false)
    }
  }

  const handleReset = () => {
    setMenuOpen(false)
    if (!confirm(
      'Reset scan history for this inbox?\n\n' +
      'Clears all previously seen thread records so every email in the scan window is re-evaluated from scratch — including ones skipped on previous scans.\n\n' +
      'Existing action items are NOT deleted.'
    )) return
    sync(true)
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await fetch('/api/scan/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      })
      onCancelled?.()
    } finally {
      setBusy(false)
    }
  }

  if (scanning) {
    return (
      <Button variant="outline" size="sm" onClick={cancel} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel scan'}
      </Button>
    )
  }

  return (
    <div ref={menuRef} className="relative flex items-center">
      {/* Main sync button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => sync(false)}
        disabled={busy}
        className="rounded-r-none border-r-0 pr-2.5"
        title={error || 'Run an incremental scan now (only new emails)'}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <><Check className="h-3.5 w-3.5 mr-1 text-done" /> Queued</>
        ) : (
          <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync now</>
        )}
      </Button>
      {/* Dropdown trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMenuOpen(o => !o)}
        disabled={busy}
        className="rounded-l-none px-1.5 border-l border-[rgb(11_18_32/15%)]"
        title="More scan options"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[rgb(11_18_32/12%)] rounded-lg shadow-lg w-64 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/35%)]">Scan options</p>
          </div>
          <button
            onClick={() => { setMenuOpen(false); sync(false) }}
            className="w-full text-left px-3 py-2 hover:bg-paper-2 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-[rgb(11_18_32/45%)]" />
              <div>
                <p className="text-sm font-medium text-ink">Sync now</p>
                <p className="text-[11px] text-[rgb(11_18_32/45%)]">Fetch only new emails since last scan</p>
              </div>
            </div>
          </button>
          <div className="mx-3 border-t border-[rgb(11_18_32/8%)]" />
          <button
            onClick={handleReset}
            className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700">Reset &amp; rescan</p>
                <p className="text-[11px] text-amber-600/70">Re-evaluate all emails in the scan window from scratch</p>
              </div>
            </div>
          </button>
          <div className="px-3 pb-2.5 pt-1">
            <p className="text-[10px] text-[rgb(11_18_32/35%)]">Existing action items are not deleted</p>
          </div>
        </div>
      )}
    </div>
  )
}
