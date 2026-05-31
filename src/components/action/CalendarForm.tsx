'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/ui/filter-select'
import { Select } from '@/components/ui/select'
import { CalendarPlus, Loader2, Check, X } from 'lucide-react'

function pad(n: number) { return n.toString().padStart(2, '0') }
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function isoFromLocal(local: string): string {
  return new Date(local).toISOString()
}

interface CalendarFormProps {
  actionItemId: string
  defaultTitle: string
  defaultDescription: string
  availableCalendars: Array<{ provider: 'gmail' | 'outlook'; emailAddress: string }>
  defaultAccountProvider: string
  defaultMeetingProvider: 'none' | 'meet' | 'teams' | 'zoom'
  meetInstalled: boolean
  teamsInstalled: boolean
  zoomConnected: boolean
  onCreated: (result: { kind: 'event' | 'task'; link?: string; meetingLink?: string }) => void
  onClose: () => void
}

function calendarLabel(provider: 'gmail' | 'outlook') {
  return provider === 'gmail' ? 'Google Calendar' : 'Outlook Calendar'
}

export function CalendarForm({
  actionItemId,
  defaultTitle,
  defaultDescription,
  availableCalendars,
  defaultAccountProvider,
  defaultMeetingProvider,
  meetInstalled,
  teamsInstalled,
  zoomConnected,
  onCreated,
  onClose,
}: CalendarFormProps) {
  const initialProvider: 'gmail' | 'outlook' =
    availableCalendars.find(c => c.provider === defaultAccountProvider)?.provider
    ?? availableCalendars[0]?.provider
    ?? 'gmail'

  const [kind, setKind] = useState<'event' | 'task'>('event')
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'outlook'>(initialProvider)
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toLocalInput(d)
  })
  const [durationMin, setDurationMin] = useState(30)
  const [reminderMin, setReminderMin] = useState(10)
  const [meetingProvider, setMeetingProvider] = useState<'none' | 'meet' | 'teams' | 'zoom'>(() => {
    // Only keep default if it's valid for the initial calendar AND installed
    if (defaultMeetingProvider === 'meet' && initialProvider === 'gmail' && meetInstalled) return 'meet'
    if (defaultMeetingProvider === 'teams' && initialProvider === 'outlook' && teamsInstalled) return 'teams'
    if (defaultMeetingProvider === 'zoom' && zoomConnected) return 'zoom'
    return 'none'
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When the user switches calendar, reset meeting provider if it's no longer valid
  const handleProviderChange = (p: 'gmail' | 'outlook') => {
    setSelectedProvider(p)
    if (meetingProvider === 'meet' && p !== 'gmail') setMeetingProvider('none')
    if (meetingProvider === 'teams' && p !== 'outlook') setMeetingProvider('none')
  }

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
          calendarProvider: selectedProvider,
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

  // Only show meeting options that are valid for the selected calendar AND
  // whose connector has been installed in Connectors.
  const meetingOptions: Array<{ value: string; label: string }> = [
    { value: 'none', label: 'No meeting link' },
    ...(selectedProvider === 'gmail' && meetInstalled ? [{ value: 'meet', label: 'Google Meet' }] : []),
    ...(selectedProvider === 'outlook' && teamsInstalled ? [{ value: 'teams', label: 'Microsoft Teams' }] : []),
    ...(zoomConnected ? [{ value: 'zoom', label: 'Zoom' }] : []),
  ]

  const calendarOptions = availableCalendars.map(c => ({
    value: c.provider,
    label: `${calendarLabel(c.provider)} (${c.emailAddress})`,
  }))

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

        {/* Calendar selector — only shown when > 1 calendar is connected */}
        {calendarOptions.length > 1 && (
          <div>
            <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Create in</label>
            <FilterSelect
              value={selectedProvider}
              onChange={v => handleProviderChange(v as 'gmail' | 'outlook')}
              options={calendarOptions}
            />
          </div>
        )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        {kind === 'event' && meetingOptions.length > 1 && (
          <div>
            <label className="block text-[11px] font-medium text-[rgb(11_18_32/55%)] mb-1">Meeting link</label>
            <FilterSelect
              value={meetingProvider}
              onChange={v => setMeetingProvider(v as typeof meetingProvider)}
              options={meetingOptions}
            />
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
