'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { X, ExternalLink, Loader2, Send, Zap, AlertCircle, Archive, Clock, ChevronDown, UserX } from 'lucide-react'
import { playChime } from '@/lib/sounds'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CalendarForm } from './CalendarForm'
import { CalendarPlus, Trash2, Paperclip, Link2 } from 'lucide-react'
import type { ActionItemWithThread } from '@/types'

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>').replace(/</g, '&lt;')}</p>`)
    .join('')
}

function pad(n: number): string { return n.toString().padStart(2, '0') }

function buildSchedulePresets(): Array<{ label: string; iso: string }> {
  const now = new Date()
  const presets: Array<{ label: string; iso: string }> = []

  const in1h = new Date(now.getTime() + 60 * 60 * 1000)
  presets.push({ label: `In 1 hour (${pad(in1h.getHours())}:${pad(in1h.getMinutes())})`, iso: in1h.toISOString() })

  const in3h = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  presets.push({ label: `In 3 hours (${pad(in3h.getHours())}:${pad(in3h.getMinutes())})`, iso: in3h.toISOString() })

  const tomorrow9 = new Date(now)
  tomorrow9.setDate(tomorrow9.getDate() + 1)
  tomorrow9.setHours(9, 0, 0, 0)
  presets.push({ label: `Tomorrow 9 AM`, iso: tomorrow9.toISOString() })

  const monday = new Date(now)
  const daysUntilMonday = (8 - monday.getDay()) % 7 || 7
  monday.setDate(monday.getDate() + daysUntilMonday)
  monday.setHours(9, 0, 0, 0)
  presets.push({ label: `Monday 9 AM`, iso: monday.toISOString() })

  return presets
}

function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ActionDrawerProps {
  item: ActionItemWithThread | null
  onClose: () => void
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
}

export function ActionDrawer({ item, onClose, onStatusChange }: ActionDrawerProps) {
  const [tone, setTone] = useState('polite')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [detail, setDetail] = useState<ActionItemWithThread | null>(null)
  const [sending, setSending] = useState(false)
  const [confirmingSend, setConfirmingSend] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null)
  const [defaultMeetingProvider, setDefaultMeetingProvider] = useState<'none' | 'meet' | 'teams' | 'zoom'>('none')
  const [zoomConnected, setZoomConnected] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarResult, setCalendarResult] = useState<{ kind: 'event' | 'task'; link?: string; meetingLink?: string } | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [ignoring, setIgnoring] = useState(false)
  const [ignoredMsg, setIgnoredMsg] = useState<string | null>(null)
  const [customWhen, setCustomWhen] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toLocalInputValue(d)
  })

  useEffect(() => {
    if (item) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null)
      setDraft('')
      setSuggestion(item.autoReplySuggestion ?? null)
      setScheduleOpen(false)
      fetch(`/api/action-items/${item.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.item) { setDetail(d.item); setSuggestion(d.item.autoReplySuggestion ?? null) } })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setSignatureHtml(d?.appSettings?.signatureHtml ?? null)
        setDefaultMeetingProvider(d?.appSettings?.defaultMeetingProvider ?? 'none')
      })
      .catch(() => {})
    fetch('/api/integrations/zoom/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setZoomConnected(!!d?.connected) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Reset calendar UI when switching items
    setCalendarOpen(false)
    setCalendarResult(null)
  }, [item?.id])

  const generateSuggestion = async () => {
    if (!item) return
    setSuggesting(true)
    try {
      const res = await fetch(`/api/action-items/${item.id}/suggest`, { method: 'POST' })
      const data = await res.json()
      if (data?.suggestion) setSuggestion(data.suggestion)
    } finally {
      setSuggesting(false)
    }
  }

  if (!item) return null
  const active = detail || item

  const ignoreSender = async (scope: 'email' | 'domain') => {
    const email = active.ownerEmail || active.emailThread?.messages?.[0]?.senderEmail || ''
    if (!email) return
    const domain = email.split('@')[1] || ''
    const label = scope === 'email' ? email : `@${domain}`
    if (!confirm(`Ignore all future emails from ${label}?`)) return
    setIgnoring(true)
    try {
      const body = scope === 'email' ? { sender_email: email } : { domain }
      const res = await fetch('/api/settings/ignored-senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      setIgnoredMsg(`Ignoring ${label}`)
      onStatusChange(active.id, 'ignored')
    } catch {
      setIgnoredMsg('Failed to add to ignore list')
    } finally {
      setIgnoring(false)
    }
  }

  const generateReply = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/action-items/${item.id}/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, output_type: 'email_reply' }),
      })
      const data = await res.json()
      setDraft(textToHtml(data.draft || 'Failed to generate draft.'))
    } finally {
      setGenerating(false)
    }
  }

  const useSuggestion = () => {
    if (!suggestion) return
    setDraft(textToHtml(suggestion))
  }

  const sendReply = async () => {
    if (!item) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/action-items/${item.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Send failed')
      }
      playChime('done')
      onStatusChange(item.id, 'done')
      onClose()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
      setConfirmingSend(false)
    }
  }

  const scheduleReply = async (scheduledForIso: string) => {
    if (!item) return
    setScheduling(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/action-items/${item.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft, scheduledFor: scheduledForIso }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Schedule failed')
      }
      playChime('info')
      onStatusChange(item.id, 'snoozed', { snoozed_until: scheduledForIso.split('T')[0] })
      onClose()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Schedule failed')
    } finally {
      setScheduling(false)
      setScheduleOpen(false)
    }
  }

  const providerLabel = active.emailThread?.providerUrl?.includes('outlook') ? 'Outlook' : 'Gmail'

  return (
    <div className="fixed inset-0 z-50">
      <div className="drawer-backdrop absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="drawer-panel absolute inset-y-0 right-0 w-full sm:w-[480px] md:w-[540px] bg-white shadow-xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-rule px-6 py-4 flex items-center justify-between z-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-[rgb(11_18_32/30%)]">Detail</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Category + priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-[rgb(11_18_32/6%)] text-ink px-2.5 py-1 rounded">
              {categoryLabel(active.category)}
            </span>
            {active.priority === 'high' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[rgb(11_18_32/55%)]">
                <span className="w-1.5 h-1.5 rounded-full bg-action inline-block" />
                High priority
              </span>
            )}
          </div>

          {/* Title & contact */}
          <div>
            <h2 className="text-base font-semibold text-ink leading-snug">
              {active.title || active.emailThread?.subject}
            </h2>
            {(active.ownerName || active.ownerEmail) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-sm text-[rgb(11_18_32/55%)]">{active.ownerName} · {active.ownerEmail}</p>
                {active.ownerEmail && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => ignoreSender('email')}
                      disabled={ignoring}
                      className="inline-flex items-center gap-1 text-[10px] text-[rgb(11_18_32/55%)] hover:text-ink border border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)] px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                      title={`Stop showing emails from ${active.ownerEmail}`}
                    >
                      <UserX className="h-2.5 w-2.5" />
                      Ignore sender
                    </button>
                    {active.ownerEmail.includes('@') && (
                      <button
                        type="button"
                        onClick={() => ignoreSender('domain')}
                        disabled={ignoring}
                        className="inline-flex items-center gap-1 text-[10px] text-[rgb(11_18_32/55%)] hover:text-ink border border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)] px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                        title={`Stop showing emails from @${active.ownerEmail.split('@')[1]}`}
                      >
                        Ignore @{active.ownerEmail.split('@')[1]}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {ignoredMsg && (
              <p className="text-xs text-action mt-1">{ignoredMsg}</p>
            )}
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-1">
              Last activity {timeAgo(active.lastActivityAt)}
            </p>
          </div>

          {/* Repeated asks alert */}
          {(active.repeatedAskCount ?? 0) >= 2 && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3.5">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  {active.ownerName || 'This contact'} has sent {active.repeatedAskCount} messages without a reply
                </p>
                <p className="text-xs text-amber-700 mt-0.5">This thread needs your immediate attention.</p>
              </div>
            </div>
          )}

          {/* Needs closure banner */}
          {active.needsClosure && !(active.repeatedAskCount && active.repeatedAskCount >= 2) && (
            <div className="flex items-start gap-2.5 bg-[rgb(11_18_32/4%)] border border-[rgb(11_18_32/10%)] rounded-lg p-3.5">
              <Archive className="h-4 w-4 text-[rgb(11_18_32/40%)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-ink">This thread looks resolved</p>
                <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">Consider marking it done or archiving.</p>
              </div>
            </div>
          )}

          {/* Intelligent reply suggestion */}
          <div className="border border-action/30 bg-action/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-action/20">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-action" />
                <p className="text-xs font-semibold text-action uppercase tracking-wider">
                  Pendingly Assist
                </p>
              </div>
              <button
                onClick={generateSuggestion}
                disabled={suggesting}
                className="text-[11px] text-action hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {suggestion ? 'Regenerate' : suggesting ? 'Thinking...' : 'Generate'}
              </button>
            </div>
            <div className="p-4">
              {suggestion ? (
                <>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{suggestion}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={useSuggestion}
                  >
                    Use this draft
                  </Button>
                </>
              ) : suggesting ? (
                <p className="text-sm text-[rgb(11_18_32/55%)]">
                  Reading the full thread and drafting an intelligent reply...
                </p>
              ) : (
                <p className="text-sm text-[rgb(11_18_32/55%)]">
                  Pendingly will read every message in this thread and propose a context-aware reply.
                </p>
              )}
            </div>
          </div>

          {/* Why */}
          <div className="bg-paper-2 rounded-lg p-4 border border-rule">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)] mb-1.5">Why this needs attention</p>
            <p className="text-sm text-ink">{active.reason}</p>
          </div>

          {/* Suggested action */}
          {active.suggestedAction && (
            <div className="bg-paper-2 rounded-lg p-4 border border-rule">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)] mb-1.5">Suggested action</p>
              <p className="text-sm text-ink">{active.suggestedAction}</p>
            </div>
          )}

          {/* Calendar / Task */}
          {!calendarOpen && !calendarResult && (active.calendarEventId || active.calendarTaskId) ? (
            <div className="bg-paper-2 rounded-lg p-4 border border-rule flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-ink">
                <CalendarPlus className="h-3.5 w-3.5 text-done" />
                {active.calendarEventId ? 'Event added to calendar' : 'Task created'}
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Remove from calendar?')) return
                  await fetch(`/api/action-items/${item.id}/calendar`, { method: 'DELETE' })
                  setCalendarResult(null)
                  // Refresh detail to pick up cleared IDs
                  fetch(`/api/action-items/${item.id}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d?.item) setDetail(d.item) })
                    .catch(() => {})
                }}
                className="text-xs text-[rgb(11_18_32/55%)] hover:text-action flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          ) : calendarResult ? (
            <div className="bg-[rgb(26_143_94/8%)] border border-[rgb(26_143_94/25%)] rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-done">{calendarResult.kind === 'event' ? 'Event created' : 'Task created'}</p>
              {calendarResult.link && (
                <a href={calendarResult.link} target="_blank" rel="noreferrer"
                  className="text-xs text-ink underline hover:no-underline inline-flex items-center gap-1">
                  Open in calendar <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {calendarResult.meetingLink && (
                <a href={calendarResult.meetingLink} target="_blank" rel="noreferrer"
                  className="text-xs text-ink underline hover:no-underline inline-flex items-center gap-1 ml-3">
                  Join meeting <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : calendarOpen ? (
            <CalendarForm
              actionItemId={item.id}
              defaultTitle={active.title || active.emailThread?.subject || 'Follow-up'}
              defaultDescription={active.suggestedAction || active.reason || ''}
              inboxProvider={active.emailThread?.emailAccount?.provider || ''}
              defaultMeetingProvider={defaultMeetingProvider}
              zoomConnected={zoomConnected}
              onCreated={(r) => { setCalendarResult(r); setCalendarOpen(false) }}
              onClose={() => setCalendarOpen(false)}
            />
          ) : (
            <button
              onClick={() => setCalendarOpen(true)}
              className="w-full text-xs text-ink border border-rule rounded-lg px-4 py-2.5 hover:bg-paper-2 transition-colors flex items-center justify-center gap-2"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar or create task
            </button>
          )}

          {/* Links & attachments aggregated across thread */}
          <ThreadResources
            messages={active.emailThread?.messages}
            inboxUrl={active.emailThread?.providerUrl ?? null}
          />

          {/* Recent messages */}
          {active.emailThread?.messages && active.emailThread.messages.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)] mb-2">Recent messages</p>
              <div className="space-y-2">
                {active.emailThread.messages.slice(-3).map((msg, i) => (
                  <div key={i} className="border border-rule rounded-lg p-3 bg-paper-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-ink">
                        {msg.isFromUser ? 'You' : msg.senderName || msg.senderEmail}
                      </p>
                      {msg.sentAt && <span className="text-[11px] text-[rgb(11_18_32/30%)]">{timeAgo(msg.sentAt)}</span>}
                    </div>
                    <p className="text-xs text-[rgb(11_18_32/55%)] line-clamp-2">{msg.bodyExcerpt || msg.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compose reply */}
          <div className="border border-rule rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-paper-2 border-b border-rule flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)]">Compose reply</p>
              <div className="flex items-center gap-2">
                <Select value={tone} onChange={e => setTone(e.target.value)} className="text-xs h-8">
                  <option value="polite">Polite</option>
                  <option value="firm">Firm</option>
                  <option value="short">Short</option>
                  <option value="executive">Executive</option>
                  <option value="friendly">Friendly</option>
                  <option value="escalation">Escalation</option>
                </Select>
                <Button onClick={generateReply} disabled={generating} size="sm" variant="outline">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Generate draft</>}
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <RichTextEditor
                value={draft}
                onChange={setDraft}
                placeholder="Write your reply, or click 'Generate draft' / 'Use this draft' above..."
                minHeight={180}
                signatureHtml={signatureHtml}
              />

              {/* Send / Schedule controls */}
              {!confirmingSend && !scheduleOpen ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => { setSendError(null); setConfirmingSend(true) }}
                    disabled={sending || scheduling || !active.ownerEmail || !draft.trim()}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSendError(null); setScheduleOpen(true) }}
                    disabled={sending || scheduling || !active.ownerEmail || !draft.trim()}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Schedule
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                  {!active.ownerEmail && (
                    <span className="text-[11px] text-[rgb(11_18_32/50%)]">No recipient on this thread</span>
                  )}
                  {sendError && (
                    <span className="text-[11px] text-action">{sendError}</span>
                  )}
                </div>
              ) : confirmingSend ? (
                <div className="flex items-center gap-2 bg-paper-2 border border-rule rounded-md px-3 py-2 flex-wrap">
                  <span className="text-xs text-ink">
                    Send to {active.ownerEmail || active.emailThread?.messages?.[0]?.senderEmail}?
                  </span>
                  <Button size="sm" onClick={sendReply} disabled={sending}>
                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm send'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmingSend(false)}
                    disabled={sending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="border border-rule rounded-md bg-paper-2 p-3 space-y-2">
                  <p className="text-xs font-semibold text-ink">Schedule send</p>
                  <div className="flex flex-wrap gap-1.5">
                    {buildSchedulePresets().map(p => (
                      <button
                        key={p.iso}
                        onClick={() => scheduleReply(p.iso)}
                        disabled={scheduling}
                        className="text-[11px] px-2.5 py-1 rounded border border-rule bg-white text-ink hover:border-[rgb(11_18_32/30%)] disabled:opacity-50 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="datetime-local"
                      value={customWhen}
                      onChange={e => setCustomWhen(e.target.value)}
                      className="text-xs rounded border border-rule bg-white px-2 py-1.5 text-ink"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const d = new Date(customWhen)
                        if (isNaN(d.getTime())) return
                        scheduleReply(d.toISOString())
                      }}
                      disabled={scheduling}
                    >
                      {scheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Schedule'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setScheduleOpen(false)}
                      disabled={scheduling}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-rule px-6 py-4 flex items-center gap-2">
          {active.emailThread?.providerUrl && (
            <Button variant="outline" size="sm" onClick={() => window.open(active.emailThread!.providerUrl!, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in {providerLabel}
            </Button>
          )}
          <Button variant="done" size="sm" onClick={() => { playChime('done'); onStatusChange(item.id, 'done'); onClose() }}>
            Mark Done
          </Button>
          <Button variant="outline" size="sm" onClick={() => { onStatusChange(item.id, 'ignored'); onClose() }}>
            Ignore
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ThreadResourcesProps {
  messages?: Array<{ linksJson: string | null; attachmentsJson: string | null }>
  inboxUrl: string | null
}

interface LinkRow { url: string; text: string }
interface AttachmentRow { filename: string; mimeType?: string; sizeBytes?: number }

function formatBytes(b?: number): string {
  if (!b || b <= 0) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function ThreadResources({ messages, inboxUrl }: ThreadResourcesProps) {
  if (!messages || messages.length === 0) return null
  // Aggregate and dedupe links across the thread; show up to 8 most recent.
  const allLinks: LinkRow[] = []
  const seenLink = new Set<string>()
  const allAttachments: AttachmentRow[] = []
  for (const m of messages) {
    if (m.linksJson) {
      try {
        const arr = JSON.parse(m.linksJson) as LinkRow[]
        for (const l of arr) {
          if (!l?.url || seenLink.has(l.url)) continue
          seenLink.add(l.url)
          allLinks.push(l)
        }
      } catch { /* ignore */ }
    }
    if (m.attachmentsJson) {
      try {
        const arr = JSON.parse(m.attachmentsJson) as AttachmentRow[]
        for (const a of arr) if (a?.filename) allAttachments.push(a)
      } catch { /* ignore */ }
    }
  }
  if (allLinks.length === 0 && allAttachments.length === 0) return null

  return (
    <div className="space-y-3">
      {allAttachments.length > 0 && (
        <div className="border border-rule rounded-lg bg-paper-2 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/55%)]">
              Attachments ({allAttachments.length})
            </p>
            {inboxUrl && (
              <a
                href={inboxUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-ink hover:underline inline-flex items-center gap-1"
              >
                Open in inbox <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="space-y-1.5">
            {allAttachments.slice(0, 6).map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-xs text-ink"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="h-3 w-3 flex-shrink-0 text-[rgb(11_18_32/50%)]" />
                  <span className="truncate">{a.filename}</span>
                </div>
                {a.sizeBytes ? (
                  <span className="text-[11px] text-[rgb(11_18_32/40%)] flex-shrink-0">{formatBytes(a.sizeBytes)}</span>
                ) : null}
              </div>
            ))}
            {allAttachments.length > 6 && (
              <p className="text-[11px] text-[rgb(11_18_32/40%)]">+{allAttachments.length - 6} more — open in inbox</p>
            )}
          </div>
        </div>
      )}
      {allLinks.length > 0 && (
        <div className="border border-rule rounded-lg bg-paper-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/55%)] mb-2">
            Links ({allLinks.length})
          </p>
          <div className="space-y-1.5">
            {allLinks.slice(0, 8).map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 text-xs text-ink hover:underline min-w-0"
              >
                <Link2 className="h-3 w-3 flex-shrink-0 text-[rgb(11_18_32/50%)]" />
                <span className="truncate">{l.text || l.url}</span>
              </a>
            ))}
            {allLinks.length > 8 && (
              <p className="text-[11px] text-[rgb(11_18_32/40%)]">+{allLinks.length - 8} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
