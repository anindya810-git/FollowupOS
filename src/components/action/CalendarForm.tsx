'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { CalendarPlus, Loader2, Check, X } from 'lucide-react'

function pad(n: number) { return n.toString().padStart(2, '0') }
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function isoFromLocal(local: string): string {
  // local is "YYYY-MM-DDTHH:mm" in user's browser timezone
  return new Date(local).toISOString()
}

interface CalendarFormProps {
  actionItemId: string
  defaultTitle: string
  defaultDescription: string
  inboxProvider: 'gmail' | 'outlook' | string
  defaultMeetingProvider: 'none' | 'meet' | 'teams' | 'zoom'
  zoomConnected: boolean
  onCreated: (result: { kind: 'event' | 'task'; link?: string; meetingLink?: string }) => void
  onClose: () => void
}

export function CalendarForm({
  actionItemId,
  defaultTitle,
  defaultDescription,
  inboxProvider,
  defaultMeetingProvider,
  zoomConnected,
  onCreated,
  onClose,
}: CalendarFormProps) {
  const [kind, setKind] = useState<'event' | 'task'>('event')
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toLocalInput(d)
  })
  const [durationMin, setDurationMin] = useState(30)
  const [reminderMin, setReminderMin] = useState(10)
  const [meetingProvider, setMeetingProvider] = useState<'none' | 'meet' | 'teams' | 'zoom'>(
    defaultMeetingProvider,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const startIso = isoFromLocal(start)
      const endIso = new Date(new Date(startIso).getTime() + durationMin * 60_000).toISOString()
      const res = await fetch(`/api/action-items/${actionItemId}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title,
          description,
          startIso,
          endIso,
          reminderMinutes: reminderMin,
          meetingProvider: kind === 'event' ? meetingProvider : 'none',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onCreated({
        kind,
        link: data.htmlLink || data.webLink,
        meetingLink: data.meetLink || data.teamsLink,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  // Conferencing options gated by inbox + zoom connection
  const meetingOptions: Array<{ value: string; label: string; disabled?: boolean }> = [
    { value: 'none', label: 'No meeting link' },
    { value: 'meet', label: 'Google Meet', disabled: inboxProvider !== 'gmail' },
    { value: 'teams', label: 'Microsoft Teams', disabled: inboxProvider !== 'outlook' },
    { value: 'zoom', label: zoomConnected ? 'Zoom' : 'Zoom (not connected)', disabled: !zoomConnected },
  ]

  return (
    <div className="border border-rule rounded-lg overflow-hidden bg-paper-2">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-rule bg-paper">
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-3.5 w-3.5 text-ink" />
          <p className="text-xs font-semibold uppercase tracking-wider text-ink">
            Add to calendar
          </p>
        </div>
        <button onClick={onClose} className="text-[rgb(11_18_32/40%)] hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-1.5">
          {(['event', 'task'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                kind === k
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-[rgb(11_18_32/60%)] border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)]'
              }`}
            >
              {k === 'event' ? 'Calendar event' : 'Task'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-sm border border-rule rounded-md px-3 py-1.5 bg-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">
            {kind === 'event' ? 'Start' : 'Due'}
          </label>
          <input
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full text-sm border border-rule rounded-md px-3 py-1.5 bg-white"
          />
        </div>

        {kind === 'event' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Duration</label>
              <Select value={String(durationMin)} onChange={e => setDurationMin(parseInt(e.target.value))} className="text-sm h-8">
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Reminder</label>
              <Select value={String(reminderMin)} onChange={e => setReminderMin(parseInt(e.target.value))} className="text-sm h-8">
                <option value="0">At start</option>
                <option value="5">5 min before</option>
                <option value="10">10 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </Select>
            </div>
          </div>
        )}

        {kind === 'event' && (
          <div>
            <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Meeting link</label>
            <Select
              value={meetingProvider}
              onChange={e => setMeetingProvider(e.target.value as typeof meetingProvider)}
              className="text-sm h-8"
            >
              {meetingOptions.map(o => (
                <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm border border-rule rounded-md px-3 py-2 bg-white resize-none"
          />
        </div>

        {error && <p className="text-xs text-action">{error}</p>}

        <Button onClick={submit} disabled={busy || !title.trim()} size="sm" className="w-full">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <><Check className="h-3.5 w-3.5 mr-1.5" /> Create {kind}</>
          )}
        </Button>
      </div>
    </div>
  )
}
