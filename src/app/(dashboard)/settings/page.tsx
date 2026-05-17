'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, AlertTriangle } from 'lucide-react'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { DEFAULT_FOLLOWUP_TEMPLATE } from '@/lib/templates'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

interface EmailAccount {
  id: string
  emailAddress: string
  provider: string
  connectedStatus: string
  webmailBaseUrl?: string | null
  webmailSearchUrlTemplate?: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<{
    appSettings: { defaultFollowupDays: number; scanWindowDays: number; conservativeMode: boolean; autoFollowupEnabled?: boolean; autoFollowupDays?: number; autoFollowupTemplate?: string | null; signatureHtml?: string | null } | null
    digestSettings: { isEnabled: boolean; digestTime: string; timezone: string; slackWebhookUrl?: string | null; slackEnabled?: boolean } | null
    ignoredSenders: Array<{ id: string; senderEmail?: string; domain?: string; reason?: string }>
  }>({ appSettings: null, digestSettings: null, ignoredSenders: [] })
  const [integrations, setIntegrations] = useState<EmailAccount[]>([])
  const [newSender, setNewSender] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncingContacts, setSyncingContacts] = useState(false)
  const [contactsSynced, setContactsSynced] = useState<number | null>(null)
  const [slackTesting, setSlackTesting] = useState(false)
  const [slackTestResult, setSlackTestResult] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/integrations').then(r => r.json()),
    ]).then(([s, i]) => {
      setSettings(s)
      setIntegrations(i.accounts || [])
    })
  }, [])

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
        autoFollowupEnabled: settings.appSettings?.autoFollowupEnabled ?? false,
        autoFollowupDays: settings.appSettings?.autoFollowupDays ?? 3,
        autoFollowupTemplate: settings.appSettings?.autoFollowupTemplate ?? null,
        signatureHtml: settings.appSettings?.signatureHtml ?? null,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

  const replayTour = async () => {
    await fetch('/api/onboarding/reset', { method: 'POST' })
    window.location.href = '/dashboard'
  }

  const deleteAccount = async () => {
    if (!confirm('Delete your account and all data? This cannot be undone.')) return
    await fetch('/api/account', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <>
      <Header title="Settings" />
      <main className="p-6 max-w-2xl">
        <div className="space-y-6">
          {/* Connected Inboxes */}
          <Card>
            <CardHeader><CardTitle>Connected Inboxes</CardTitle></CardHeader>
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
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-ink">{account.emailAddress}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-[rgb(11_18_32/8%)] text-ink">
                              {account.provider === 'outlook' ? 'Outlook' : account.provider === 'zoho' ? 'Zoho Mail' : account.provider === 'apple' ? 'Apple Mail' : account.provider === 'imap' ? 'IMAP' : 'Gmail'}
                            </span>
                            <span className="text-xs text-[rgb(11_18_32/55%)] capitalize">{account.connectedStatus}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => disconnectAccount(account)}>
                          Disconnect
                        </Button>
                      </div>
                      {isImapStyle && (
                        <WebmailUrlField
                          account={account}
                          onSaved={(url, template) => setIntegrations(prev => prev.map(a => a.id === account.id ? { ...a, webmailBaseUrl: url, webmailSearchUrlTemplate: template ?? a.webmailSearchUrlTemplate } : a))}
                        />
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { window.location.href = '/api/integrations/gmail/connect' }}
                >
                  + Add Gmail
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { window.location.href = '/api/integrations/outlook/connect' }}
                >
                  + Add Outlook
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncContacts}
                  disabled={syncingContacts}
                >
                  {syncingContacts ? 'Syncing...' : 'Sync Contact Names'}
                </Button>
                {contactsSynced !== null && (
                  <span className="text-xs text-[rgb(11_18_32/55%)]">
                    Synced {contactsSynced} contact{contactsSynced !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Rules */}
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

          {/* Daily Digest */}
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

          {/* Slack Integration */}
          <Card>
            <CardHeader><CardTitle>Slack Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="slackEnabled"
                  checked={settings.digestSettings?.slackEnabled ?? false}
                  onChange={e => setSettings(s => ({ ...s, digestSettings: { ...(s.digestSettings ?? { isEnabled: true, digestTime: '09:00', timezone: 'Asia/Kolkata' }), slackEnabled: e.target.checked } }))}
                  className="h-4 w-4 accent-action"
                />
                <label htmlFor="slackEnabled" className="text-sm font-medium text-ink">
                  Send daily digest to Slack
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Webhook URL</label>
                <Input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={settings.digestSettings?.slackWebhookUrl ?? ''}
                  onChange={e => setSettings(s => ({ ...s, digestSettings: { ...(s.digestSettings ?? { isEnabled: true, digestTime: '09:00', timezone: 'Asia/Kolkata' }), slackWebhookUrl: e.target.value } }))}
                />
                <p className="text-xs text-[rgb(11_18_32/55%)] mt-1">
                  Get a webhook URL from{' '}
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="underline">
                    https://api.slack.com/messaging/webhooks
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={slackTesting || !settings.digestSettings?.slackWebhookUrl}
                  onClick={async () => {
                    setSlackTesting(true)
                    setSlackTestResult(null)
                    try {
                      const res = await fetch('/api/integrations/slack/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ webhookUrl: settings.digestSettings?.slackWebhookUrl }),
                      })
                      const data = await res.json()
                      setSlackTestResult(res.ok ? 'Test message sent!' : (data.error || 'Failed'))
                    } catch {
                      setSlackTestResult('Failed')
                    } finally {
                      setSlackTesting(false)
                    }
                  }}
                >
                  {slackTesting ? 'Sending...' : 'Send Test'}
                </Button>
                {slackTestResult && (
                  <span className="text-xs text-[rgb(11_18_32/55%)]">{slackTestResult}</span>
                )}
              </div>
            </CardContent>
          </Card>

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

          {/* Notifications */}
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[rgb(11_18_32/55%)]">
                Get push notifications on this device when follow-ups are pending.
              </p>
              <PushNotificationToggle />
            </CardContent>
          </Card>

          {/* Automation */}
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

          {/* Email signature */}
          <Card>
            <CardHeader><CardTitle>Email signature</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-[rgb(11_18_32/55%)] mb-3">
                Appended via the &quot;Insert signature&quot; button in the reply editor.
              </p>
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
            </CardContent>
          </Card>

          <Button onClick={save} disabled={saving} className="w-full">
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
          </Button>

          {/* AI Provider */}
          <AiProviderCard />

          {/* Product tour */}
          <Card>
            <CardHeader><CardTitle>Product Tour</CardTitle></CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" onClick={replayTour}>Replay tour</Button>
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-2">Walks you through how Pendingly works from the dashboard.</p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-[rgb(242_90_60/20%)]">
            <CardHeader><CardTitle className="text-action flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={deleteAccount}>Delete Account &amp; All Data</Button>
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-2">This permanently deletes your account and all stored data. Cannot be undone.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

type ProviderStatus = { hasKey: boolean; hasEnvFallback: boolean }
type AiConfigStatus = {
  preferredProvider: string | null
  providers: { anthropic: ProviderStatus; openai: ProviderStatus; gemini: ProviderStatus }
}

const PROVIDER_META = {
  gemini:    { label: 'Google Gemini',  placeholder: 'AIza...',     docs: 'https://aistudio.google.com/apikey',         note: 'Free tier available — get a key at Google AI Studio. Model: gemini-2.0-flash.' },
  anthropic: { label: 'Anthropic',      placeholder: 'sk-ant-...',  docs: 'https://console.anthropic.com/settings/keys', note: 'Claude Sonnet 4.6. ~$0.20–0.50 per inbox scan.' },
  openai:    { label: 'OpenAI',         placeholder: 'sk-...',      docs: 'https://platform.openai.com/api-keys',        note: 'GPT-4o mini. Very cost-effective per scan.' },
} as const

type Provider = keyof typeof PROVIDER_META

function AiProviderCard() {
  const [config, setConfig] = useState<AiConfigStatus | null>(null)
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
  }

  useEffect(() => { refresh() }, [])

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
        <CardTitle>AI Provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-[rgb(11_18_32/55%)]">
          Pendingly uses AI to classify your threads, detect what needs a reply, and draft responses.
          Add a key for any provider. If no key is saved, the server-side Gemini free tier is used if configured.
        </p>

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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{meta.label}</p>
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
                    placeholder={meta.placeholder}
                    value={inputs[provider]}
                    onChange={e => setInputs(i => ({ ...i, [provider]: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    size="sm"
                    onClick={() => saveKey(provider)}
                    disabled={saving === provider || !inputs[provider].trim()}
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
