'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { X, ExternalLink, Loader2, Send, Zap, AlertCircle, Archive, Clock, ChevronDown } from 'lucide-react'
import { playChime } from '@/lib/sounds'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
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
  const [scheduling, setScheduling] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
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
      .then(d => { setSignatureHtml(d?.appSettings?.signatureHtml ?? null) })
      .catch(() => {})
  }, [])

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
              <p className="text-sm text-[rgb(11_18_32/55%)] mt-1">{active.ownerName} · {active.ownerEmail}</p>
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
                  Intelligent reply suggestion
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
