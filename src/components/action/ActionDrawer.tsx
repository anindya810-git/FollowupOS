'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/ui/filter-select'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { X, ExternalLink, Loader2, Send, Zap, AlertCircle, Archive, Clock, ChevronDown, Check, EyeOff, RotateCcw, Eye } from 'lucide-react'
import { playChime } from '@/lib/sounds'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CalendarForm } from './CalendarForm'
import { SnoozeMenu } from './SnoozeMenu'
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
  // 10-second "undo send" window. undoCountdown !== null means a send is armed
  // but not yet fired; pendingSendRef/sendPayloadRef let us flush it if the
  // drawer closes or switches items before the timer elapses.
  const [undoCountdown, setUndoCountdown] = useState<number | null>(null)
  const pendingSendRef = useRef(false)
  const sendPayloadRef = useRef<{ id: string; content: string } | null>(null)
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null)
  const [defaultMeetingProvider, setDefaultMeetingProvider] = useState<'none' | 'meet' | 'teams' | 'zoom'>('none')
  const [zoomConnected, setZoomConnected] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarResult, setCalendarResult] = useState<{ kind: 'event' | 'task'; link?: string; meetingLink?: string } | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [ignoring, setIgnoring] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{ provider: string; emailAddress: string }>>([])
  const [installedConnectors, setInstalledConnectors] = useState<string[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [ignoreFooterOpen, setIgnoreFooterOpen] = useState(false)
  const ignoreFooterRef = useRef<HTMLDivElement>(null)
  const [watchOpen, setWatchOpen] = useState(false)
  const [watchMsg, setWatchMsg] = useState<string | null>(null)
  const watchRef = useRef<HTMLDivElement>(null)
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
      setScheduleOpen(false)
      setConfirmingSend(false)
      setUndoCountdown(null)
      fetch(`/api/action-items/${item.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.item) {
            setDetail(d.item)
            // Meeting follow-ups (and other thread-less items) arrive with a
            // pre-generated draft — prefill the compose box so it's ready to edit.
            if (!d.item.emailThread && d.item.autoReplySuggestion) {
              setDraft(textToHtml(d.item.autoReplySuggestion))
            }
          }
        })
        .catch(() => {})
      // AI thread summary (cached server-side after first view).
      setSummary(null)
      setSummaryLoading(true)
      fetch(`/api/action-items/${item.id}/summary`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setSummary(d?.summary ?? null))
        .catch(() => setSummary(null))
        .finally(() => setSummaryLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/integrations').then(r => r.ok ? r.json() : null),
      fetch('/api/integrations/zoom/status').then(r => r.ok ? r.json() : null),
    ]).then(([settings, integrations, zoom]) => {
      setSignatureHtml(settings?.appSettings?.signatureHtml ?? null)
      setDefaultMeetingProvider(settings?.appSettings?.defaultMeetingProvider ?? 'none')
      let installed: string[] = []
      try {
        const raw = settings?.appSettings?.enabledConnectors
        if (raw) installed = JSON.parse(raw)
      } catch { installed = [] }
      setInstalledConnectors(Array.isArray(installed) ? installed : [])
      const accounts: Array<{ provider: string; emailAddress: string; connectedStatus: string }> =
        integrations?.accounts ?? []
      setConnectedAccounts(accounts.filter(a => a.connectedStatus === 'connected'))
      setZoomConnected(!!zoom?.connected)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Reset calendar UI when switching items
    setCalendarOpen(false)
    setCalendarResult(null)
    setIgnoreFooterOpen(false)
    setWatchOpen(false)
    setWatchMsg(null)
  }, [item?.id])

  useEffect(() => {
    if (!ignoreFooterOpen) return
    const handler = (e: MouseEvent) => {
      if (ignoreFooterRef.current && !ignoreFooterRef.current.contains(e.target as Node)) {
        setIgnoreFooterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ignoreFooterOpen])

  useEffect(() => {
    if (!watchOpen) return
    const handler = (e: MouseEvent) => {
      if (watchRef.current && !watchRef.current.contains(e.target as Node)) setWatchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [watchOpen])

  // If the drawer closes or switches items while a send is still armed, flush
  // it (fire-and-forget) so the email isn't silently dropped.
  useEffect(() => {
    return () => {
      if (pendingSendRef.current && sendPayloadRef.current) {
        const p = sendPayloadRef.current
        pendingSendRef.current = false
        fetch(`/api/action-items/${p.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: p.content }),
        }).catch(() => {})
      }
    }
  }, [item?.id])

  // Arm the send: start a 10-second undo window instead of sending immediately.
  const armSend = () => {
    if (!item) return
    sendPayloadRef.current = { id: item.id, content: draft }
    pendingSendRef.current = true
    setSendError(null)
    setUndoCountdown(10)
  }

  const undoSend = () => {
    pendingSendRef.current = false
    sendPayloadRef.current = null
    setUndoCountdown(null)
  }

  // Actually fire the send (called when the undo window elapses).
  const finalizeSend = async () => {
    if (!pendingSendRef.current || !sendPayloadRef.current) return
    const payload = sendPayloadRef.current
    pendingSendRef.current = false
    setUndoCountdown(null)
    setSending(true)
    try {
      const res = await fetch(`/api/action-items/${payload.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload.content }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Send failed')
      }
      playChime('done')
      onStatusChange(payload.id, 'done')
      onClose()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed')
      setConfirmingSend(false)
    } finally {
      setSending(false)
    }
  }

  // Undo-send countdown: tick down each second; fire the send at zero. Declared
  // before the early return to satisfy rules-of-hooks.
  useEffect(() => {
    if (undoCountdown === null) return
    if (undoCountdown <= 0) { void finalizeSend(); return }
    const t = setTimeout(() => setUndoCountdown(c => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoCountdown])

  if (!item) return null
  const active = detail || item

  // Calendars the user can create events in: a connected inbox whose matching
  // calendar connector has been installed in Connectors. A connected Gmail/Outlook
  // account alone is not enough — the connector must be explicitly installed.
  const availableCalendars = connectedAccounts
    .filter(a =>
      (a.provider === 'gmail' && installedConnectors.includes('google_calendar')) ||
      (a.provider === 'outlook' && installedConnectors.includes('outlook_calendar')),
    ) as Array<{ provider: 'gmail' | 'outlook'; emailAddress: string }>

  // The "contact" is whoever sent the email — the most recent inbound
  // (non-user) message. ownerEmail is set by the AI classifier and is often the
  // user's own address when owner_type=user, so it must NEVER be used as a
  // reply recipient. This mirrors the server logic in
  // /api/action-items/[id]/send so the displayed "Send to …" matches what's
  // actually sent. The self-comparison is case-insensitive.
  const selfEmail = (active.emailThread?.emailAccount?.emailAddress || '').trim().toLowerCase()
  const lastInbound = active.emailThread?.messages?.find(
    m => !m.isFromUser && m.senderEmail && m.senderEmail.trim().toLowerCase() !== selfEmail,
  )
  // Guard: never surface the user's own address as the reply target, even if
  // a message was stored with isFromUser=false due to a scanner quirk.
  const rawContactEmail = lastInbound?.senderEmail || ''
  const contactEmail = selfEmail && rawContactEmail.trim().toLowerCase() === selfEmail ? '' : rawContactEmail
  const contactName = (selfEmail && rawContactEmail.trim().toLowerCase() === selfEmail) ? '' : (lastInbound?.senderName || '')
  // Thread-less items (meeting follow-up drafts) have no inbound message — the
  // recipient is the attendee stored as ownerEmail (ownerType 'other_person',
  // never the user). This lets the draft be sent as a fresh email in one tap.
  const threadlessRecipient = !active.emailThread && active.ownerType !== 'user' ? (active.ownerEmail || '') : ''
  const effectiveContactEmail = contactEmail || threadlessRecipient
  const effectiveContactName = contactName || (threadlessRecipient ? (active.ownerName || '') : '')
  // Canonical reply recipient (label for display): inbound sender / attendee, never self.
  const recipientLabel = effectiveContactName || effectiveContactEmail || 'sender'
  const hasRecipient = !!effectiveContactEmail

  const ignoreSender = async (scope: 'email' | 'domain') => {
    const email = contactEmail
    if (!email) return
    const domain = email.split('@')[1] || ''
    setIgnoring(true)
    try {
      const body = scope === 'email' ? { sender_email: email } : { domain }
      const res = await fetch('/api/settings/ignored-senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      onStatusChange(active.id, 'ignored')
      onClose()
    } catch {
      // ignore silently — drawer stays open on failure
    } finally {
      setIgnoring(false)
    }
  }

  const addToWatch = async (scope: 'thread' | 'email' | 'domain') => {
    setWatchOpen(false)
    let payload: Record<string, string> = {}
    let confirmMsg = ''
    if (scope === 'thread') {
      const threadId = active.emailThread?.providerThreadId
      if (!threadId) return
      payload = { thread_id: threadId, label: active.title || active.emailThread?.subject || 'Watched thread' }
      confirmMsg = 'Watching this thread'
    } else if (scope === 'email') {
      if (!contactEmail) return
      payload = { sender_email: contactEmail, label: contactName || contactEmail }
      confirmMsg = `Watching ${contactEmail}`
    } else {
      const domain = contactEmail.split('@')[1] || ''
      if (!domain) return
      payload = { domain, label: `@${domain}` }
      confirmMsg = `Watching @${domain}`
    }
    try {
      const res = await fetch('/api/settings/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      setWatchMsg(confirmMsg)
    } catch {
      setWatchMsg('Could not add to watchlist')
    }
  }

  const generateReply = async () => {
    setGenerating(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/action-items/${item.id}/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, output_type: 'email_reply' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error || 'Failed to generate draft')
        return
      }
      if (data.draft) {
        setDraft(textToHtml(data.draft))
      } else {
        setSendError('Draft generation returned an empty response')
      }
    } catch {
      setSendError('Failed to generate draft')
    } finally {
      setGenerating(false)
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
            {(effectiveContactName || effectiveContactEmail) && (
              <div className="mt-1">
                {effectiveContactName && (
                  <p className="text-sm font-medium text-[rgb(11_18_32/70%)]">{effectiveContactName}</p>
                )}
                {effectiveContactEmail && (
                  <p className="text-xs text-[rgb(11_18_32/45%)]">{effectiveContactEmail}</p>
                )}
              </div>
            )}

            {/* WatchList control */}
            <div className="mt-2 flex items-center gap-2">
              <div ref={watchRef} className="relative">
                <button
                  type="button"
                  onClick={() => setWatchOpen(o => !o)}
                  className="inline-flex items-center gap-1.5 text-xs text-[rgb(11_18_32/60%)] hover:text-ink border border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)] px-2 py-1 rounded-md transition-colors"
                  title="Get push notifications for new mail here"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Watch
                  <ChevronDown className="h-3 w-3" />
                </button>
                {watchOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-rule rounded-lg shadow-lg z-50 min-w-[220px] py-1 text-xs">
                    <button className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink" onClick={() => addToWatch('thread')}>
                      <span className="font-medium">Watch this thread</span>
                      <span className="block text-[rgb(11_18_32/40%)]">Notify me on every new reply</span>
                    </button>
                    {contactEmail && (
                      <button className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink border-t border-rule" onClick={() => addToWatch('email')}>
                        <span className="font-medium">Watch this sender</span>
                        <span className="block text-[rgb(11_18_32/40%)] truncate">{contactEmail}</span>
                      </button>
                    )}
                    {contactEmail.includes('@') && (
                      <button className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink border-t border-rule" onClick={() => addToWatch('domain')}>
                        <span className="font-medium">Watch all from @{contactEmail.split('@')[1]}</span>
                        <span className="block text-[rgb(11_18_32/40%)]">Every email from this domain</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {watchMsg && (
                <span className="inline-flex items-center gap-1 text-xs text-action">
                  <Eye className="h-3 w-3" />{watchMsg}
                </span>
              )}
            </div>

            <p className="text-xs text-[rgb(11_18_32/30%)] mt-2">
              Last activity {timeAgo(active.lastActivityAt)}
            </p>
          </div>

          {/* Commitment / reply-deadline banner — something the user promised */}
          {active.commitmentText && active.ownerType === 'user' && active.status === 'open' && (
            <div className="flex items-start gap-2.5 bg-[rgb(242_90_60/6%)] border border-[rgb(242_90_60/20%)] rounded-lg p-3.5">
              <Clock className="h-4 w-4 text-action flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-ink">You committed to this{active.dueDate ? ` — due ${active.dueDate}` : ''}</p>
                <p className="text-xs text-[rgb(11_18_32/70%)] mt-0.5">“{active.commitmentText}”</p>
                <p className="text-xs text-[rgb(11_18_32/50%)] mt-0.5">We&apos;ll remind you before the deadline so you don&apos;t break your word.</p>
              </div>
            </div>
          )}

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

          {/* Closure nudge — shown only when the AI analysed the thread content
              and produced a specific reason it can be closed (closureReason). */}
          {active.closureReason && active.status === 'open'
            && !(active.repeatedAskCount && active.repeatedAskCount >= 2) && (
            <div className="flex items-start gap-2.5 bg-[rgb(11_18_32/4%)] border border-[rgb(11_18_32/10%)] rounded-lg p-3.5">
              <Archive className="h-4 w-4 text-[rgb(11_18_32/40%)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink">This thread looks done — you can let it go</p>
                <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">{active.closureReason}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => { playChime('done'); onStatusChange(item.id, 'done'); onClose() }}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Drop it
                </Button>
              </div>
            </div>
          )}

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

          {/* AI thread summary */}
          {active.emailThread && (
            <div className="bg-paper-2 rounded-lg p-4 border border-rule">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)] mb-1.5 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-action" /> Thread summary
              </p>
              {summaryLoading ? (
                <div className="flex items-center gap-2 text-xs text-[rgb(11_18_32/45%)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Summarising the conversation…
                </div>
              ) : summary ? (
                <p className="text-sm text-ink leading-relaxed">{summary}</p>
              ) : (
                <p className="text-xs text-[rgb(11_18_32/45%)]">Summary unavailable for this thread.</p>
              )}
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
              availableCalendars={availableCalendars}
              defaultAccountProvider={active.emailThread?.emailAccount?.provider || ''}
              defaultMeetingProvider={defaultMeetingProvider}
              meetInstalled={installedConnectors.includes('google_meet')}
              teamsInstalled={installedConnectors.includes('microsoft_teams')}
              zoomConnected={zoomConnected}
              onCreated={(r) => { setCalendarResult(r); setCalendarOpen(false) }}
              onClose={() => setCalendarOpen(false)}
            />
          ) : availableCalendars.length > 0 ? (
            <button
              onClick={() => setCalendarOpen(true)}
              className="w-full text-xs text-ink border border-rule rounded-lg px-4 py-2.5 hover:bg-paper-2 transition-colors flex items-center justify-center gap-2"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar or create task
            </button>
          ) : null}

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
                <FilterSelect
                  value={tone}
                  onChange={setTone}
                  className="w-32"
                  options={[
                    { value: 'polite', label: 'Polite' },
                    { value: 'firm', label: 'Firm' },
                    { value: 'short', label: 'Short' },
                    { value: 'executive', label: 'Executive' },
                    { value: 'friendly', label: 'Friendly' },
                    { value: 'escalation', label: 'Escalation' },
                  ]}
                />
                <Button onClick={generateReply} disabled={generating} size="sm" variant="outline" className="gap-1.5">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Zap className="h-3.5 w-3.5" /> Pendingly Assist</>}
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <RichTextEditor
                value={draft}
                onChange={setDraft}
                placeholder="Write your reply, or click 'Pendingly Assist' above to draft one..."
                minHeight={180}
                signatureHtml={signatureHtml}
              />

              {/* Send / Schedule controls */}
              {!confirmingSend && !scheduleOpen ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    return (<>
                      <Button
                        size="sm"
                        onClick={() => { setSendError(null); setConfirmingSend(true) }}
                        disabled={sending || scheduling || !hasRecipient || !draft.trim()}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSendError(null); setScheduleOpen(true) }}
                        disabled={sending || scheduling || !hasRecipient || !draft.trim()}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Schedule
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                      {!hasRecipient && (
                        <span className="text-[11px] text-[rgb(11_18_32/50%)]">No recipient on this thread</span>
                      )}
                    </>)
                  })()}
                  {sendError && (
                    <span className="text-[11px] text-action">{sendError}</span>
                  )}
                </div>
              ) : confirmingSend ? (
                undoCountdown !== null ? (
                  <div className="flex items-center gap-2 bg-[rgb(26_143_94/8%)] border border-[rgb(26_143_94/25%)] rounded-md px-3 py-2 flex-wrap">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-done" />
                    <span className="text-xs text-ink">
                      Sending to {recipientLabel} in {undoCountdown}s…
                    </span>
                    <Button size="sm" variant="outline" onClick={undoSend} className="ml-auto">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Undo
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-paper-2 border border-rule rounded-md px-3 py-2 flex-wrap">
                    <span className="text-xs text-ink">
                      Send to {recipientLabel}?
                    </span>
                    <Button size="sm" onClick={armSend} disabled={sending}>
                      <Send className="h-3 w-3 mr-1.5" />
                      Send
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
                )
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
            <Button variant="ghost" size="sm" onClick={() => window.open(active.emailThread!.providerUrl!, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              View in Inbox
            </Button>
          )}
          {active.status !== 'open' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { playChime('info'); onStatusChange(item.id, 'open'); onClose() }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {active.status === 'done' ? 'Undo (reopen)' : active.status === 'ignored' ? 'Undo ignore' : 'Unsnooze'}
            </Button>
          ) : (
            <>
              <SnoozeMenu onSelect={(d) => { playChime('info'); onStatusChange(item.id, 'snoozed', { snoozed_until: d }); onClose() }}>
                <Button variant="ghost" size="sm">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Snooze
                </Button>
              </SnoozeMenu>
              <Button variant="ghost" size="sm" onClick={() => { playChime('done'); onStatusChange(item.id, 'done'); onClose() }}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Done
              </Button>
              <div ref={ignoreFooterRef} className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIgnoreFooterOpen(o => !o)}
                  disabled={ignoring}
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  Ignore
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Button>
                {ignoreFooterOpen && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-rule rounded-lg shadow-lg z-50 min-w-[200px] py-1 text-xs">
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink"
                      onClick={() => { setIgnoreFooterOpen(false); ignoreSender('email') }}
                    >
                      <span className="font-medium">Ignore this sender</span>
                      {contactEmail && <span className="block text-[rgb(11_18_32/40%)] truncate">{contactEmail}</span>}
                    </button>
                    {contactEmail.includes('@') && (
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink border-t border-rule"
                        onClick={() => { setIgnoreFooterOpen(false); ignoreSender('domain') }}
                      >
                        <span className="font-medium">Ignore all from @{contactEmail.split('@')[1]}</span>
                        <span className="block text-[rgb(11_18_32/40%)]">Every email from this domain</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
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

// Filter out inline image filenames that are generated by email clients for
// embedded body/signature images. This catches data stored before the
// extractor was updated to check Content-Disposition.
function isLikelyInlineImage(filename: string): boolean {
  const f = filename.toLowerCase()
  if (/^image\d+\.(png|jpe?g|gif|webp)$/.test(f)) return true      // Outlook: image001.png
  if (/^outlook-[a-f0-9-]+\.(png|jpe?g|gif)$/i.test(f)) return true // Outlook CID images
  return false
}

function ThreadResources({ messages, inboxUrl }: ThreadResourcesProps) {
  if (!messages || messages.length === 0) return null
  // Aggregate and dedupe links across the thread.
  const allLinks: LinkRow[] = []
  const seenLink = new Set<string>()
  const allAttachments: AttachmentRow[] = []
  const seenAttachment = new Set<string>()
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
        for (const a of arr) {
          if (!a?.filename || isLikelyInlineImage(a.filename)) continue
          // Dedupe same filename across messages (same attachment forwarded)
          if (seenAttachment.has(a.filename)) continue
          seenAttachment.add(a.filename)
          allAttachments.push(a)
        }
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
              <p className="text-[11px] text-[rgb(11_18_32/40%)]">+{allAttachments.length - 6} more</p>
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
