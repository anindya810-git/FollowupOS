'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<{
    appSettings: { defaultFollowupDays: number; scanWindowDays: number; conservativeMode: boolean } | null
    digestSettings: { isEnabled: boolean; digestTime: string; timezone: string } | null
    ignoredSenders: Array<{ id: string; senderEmail?: string; domain?: string; reason?: string }>
  }>({ appSettings: null, digestSettings: null, ignoredSenders: [] })
  const [integrations, setIntegrations] = useState<Array<{ id: string; emailAddress: string; connectedStatus: string }>>([])
  const [newSender, setNewSender] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const disconnectGmail = async () => {
    if (!confirm('Disconnect Gmail? This will stop future scans.')) return
    await fetch('/api/integrations/gmail/disconnect', { method: 'POST' })
    window.location.href = '/'
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">No Gmail account connected</span>
                  <Button onClick={() => window.location.href = '/connect'}>Connect Gmail</Button>
                </div>
              ) : (
                integrations.map(account => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.emailAddress}</p>
                      <p className="text-sm text-gray-500 capitalize">{account.connectedStatus}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={disconnectGmail}>Disconnect</Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Follow-up Rules */}
          <Card>
            <CardHeader><CardTitle>Follow-up Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="h-4 w-4 text-indigo-600"
                />
                <label htmlFor="digestEnabled" className="text-sm font-medium text-gray-700">
                  Enable daily digest email
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Digest time</label>
                <Input
                  type="time"
                  value={settings.digestSettings?.digestTime ?? '09:00'}
                  onChange={e => setSettings(s => ({ ...s, digestSettings: { ...s.digestSettings!, digestTime: e.target.value } }))}
                  className="w-32"
                />
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
                <div key={s.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-700">{s.senderEmail || s.domain}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeIgnoredSender(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button onClick={save} disabled={saving} className="w-full">
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
          </Button>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader><CardTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={deleteAccount}>Delete Account &amp; All Data</Button>
              <p className="text-xs text-gray-500 mt-2">This permanently deletes your account and all stored data. Cannot be undone.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
