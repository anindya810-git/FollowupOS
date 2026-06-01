'use client'
import { useEffect, useState } from 'react'
import { Clock, Check, ExternalLink, Calendar as CalendarIcon, ChevronRight } from 'lucide-react'
import { playChime } from '@/lib/sounds'
import { SnoozeMenu } from '@/components/action/SnoozeMenu'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export interface SerializedItem {
  id: string
  title: string
  reason: string | null
  ownerName: string | null
  ownerEmail: string | null
  category: string
  priority: string
  dueDate: string | null
  lastActivityAt: string | null
  providerUrl: string | null
  inboxEmail: string | null
  inboxProvider: string | null
}

interface IntelliActionData {
  greeting: string
  dateLabel: string
  estimatedMinutes: number
  doneToday: number
  tiers: {
    urgent: SerializedItem[]
    quickReply: SerializedItem[]
    deeperReply: SerializedItem[]
    chase: SerializedItem[]
    other: SerializedItem[]
  }
  counts: {
    urgent: number
    quickReply: number
    deeperReply: number
    chase: number
    other: number
  }
  autoFollowupEnabled: boolean
}

interface IntelliActionProps {
  onSelectItem: (item: SerializedItem) => void
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => Promise<void>
  meetingsByEmail: Record<string, { subject: string; startTime: string }>
}

function formatMeetingTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Meeting at ${time}`
  if (isTomorrow) return `Meeting tomorrow ${time}`
  return `Meeting ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

function InboxChip({ email }: { email: string }) {
  return (
    <span
      className="text-[10px] text-[rgb(11_18_32/40%)] bg-[rgb(11_18_32/4%)] border border-[rgb(11_18_32/8%)] px-1.5 py-0.5 rounded font-mono truncate min-w-0 max-w-[150px]"
      title={`Inbox: ${email}`}
    >
      {email}
    </span>
  )
}

function IntelliItem({
  item,
  meeting,
  onOpen,
  onStatusChange,
  compact,
}: {
  item: SerializedItem
  meeting?: { subject: string; startTime: string }
  onOpen: () => void
  onStatusChange: (status: string, extra?: Record<string, string>) => void
  compact?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const handle = async (status: string, extra?: Record<string, string>) => {
    setLoading(true)
    try {
      await onStatusChange(status, extra)
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-paper-2 rounded transition-colors group">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <p className="text-sm text-ink truncate">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {item.ownerName && (
              <span className="text-xs text-mute truncate min-w-0">{item.ownerName}</span>
            )}
            {item.inboxEmail && <InboxChip email={item.inboxEmail} />}
          </div>
        </div>
        <button
          onClick={onOpen}
          className="ml-2 text-xs px-2.5 py-1 rounded bg-ink text-white hover:opacity-90 transition"
        >
          Open
        </button>
      </div>
    )
  }

  return (
    <div
      className="card-lift bg-white border border-rule rounded-lg cursor-pointer hover:border-ink-30 transition-colors"
      onClick={onOpen}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate leading-snug">{item.title}</p>
            {(item.ownerName || item.inboxEmail) && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {item.ownerName && <span className="text-xs text-mute">{item.ownerName}</span>}
                {item.inboxEmail && <InboxChip email={item.inboxEmail} />}
              </div>
            )}
            {item.reason && (
              <p className="text-xs text-mute mt-1 line-clamp-2">{item.reason}</p>
            )}
            {meeting && (
              <span
                className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-action font-medium"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <CalendarIcon className="h-2.5 w-2.5" />
                {formatMeetingTime(meeting.startTime)}
              </span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            {item.lastActivityAt && (
              <p className="text-[11px] text-[rgb(11_18_32/30%)]">{timeAgo(item.lastActivityAt)}</p>
            )}
            {item.dueDate && (
              <p className="text-[11px] text-ink mt-0.5">Due {item.dueDate}</p>
            )}
          </div>
        </div>
      </div>
      <div
        className="flex items-center gap-1 px-3 pb-2 pt-2 border-t border-rule"
        onClick={e => e.stopPropagation()}
      >
        <SnoozeMenu
          onSelect={d => {
            playChime('info')
            handle('snoozed', { snoozed_until: d })
          }}
        >
          <button
            disabled={loading}
            className="text-xs px-2 py-1 rounded text-ink hover:bg-paper-2 transition disabled:opacity-50 inline-flex items-center"
          >
            <Clock className="h-3 w-3 mr-1" />
            Snooze
          </button>
        </SnoozeMenu>
        {item.providerUrl && (
          <button
            onClick={() => window.open(item.providerUrl!, '_blank')}
            className="text-xs px-2 py-1 rounded text-ink hover:bg-paper-2 transition inline-flex items-center"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View in Inbox
          </button>
        )}
        <button
          onClick={onOpen}
          className="text-xs px-2 py-1 rounded text-ink hover:bg-paper-2 transition inline-flex items-center"
        >
          <Check className="h-3 w-3 mr-1" />
          Open
        </button>
      </div>
    </div>
  )
}

function TierHeader({
  label,
  tone,
  subtitle,
}: {
  label: string
  tone: 'action' | 'ink' | 'mute'
  subtitle?: string
}) {
  const dotClass =
    tone === 'action' ? 'bg-action' : tone === 'ink' ? 'bg-ink' : 'bg-mute'
  const textClass =
    tone === 'action' ? 'text-action' : tone === 'ink' ? 'text-ink' : 'text-mute'
  return (
    <div className="mb-3">
      <div
        className={`flex items-center gap-2 ${textClass}`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="text-[11px] uppercase tracking-widest font-medium">{label}</span>
      </div>
      {subtitle && (
        <p
          className="text-[11px] text-mute mt-1"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

export function IntelliAction({ onSelectItem, onStatusChange, meetingsByEmail }: IntelliActionProps) {
  const [data, setData] = useState<IntelliActionData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch('/api/dashboard/intelliaction')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleChange = async (id: string, status: string, extra?: Record<string, string>) => {
    // Optimistically remove item from all tiers immediately so the UI
    // clears without waiting for the server round-trip.
    if (status !== 'open') {
      setData(prev => {
        if (!prev) return prev
        const out = (arr: SerializedItem[]) => arr.filter(i => i.id !== id)
        return {
          ...prev,
          tiers: {
            urgent:      out(prev.tiers.urgent),
            quickReply:  out(prev.tiers.quickReply),
            deeperReply: out(prev.tiers.deeperReply),
            chase:       out(prev.tiers.chase),
            other:       out(prev.tiers.other),
          },
        }
      })
    }
    await onStatusChange(id, status, extra)
    load()
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="bg-card border border-rule rounded-lg p-6 animate-pulse-soft">
          <div className="h-4 w-40 bg-paper-2 rounded mb-2" />
          <div className="h-3 w-64 bg-paper-2 rounded" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { tiers, counts } = data
  const totalItems =
    tiers.urgent.length +
    tiers.quickReply.length +
    tiers.deeperReply.length +
    tiers.chase.length +
    tiers.other.length

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="mb-4 animate-fade-up">
        <p
          className="text-[11px] uppercase tracking-widest text-mute"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          IntelliAction
        </p>
        <h2 className="text-lg font-semibold text-ink mt-1">
          {data.greeting} <span className="text-mute font-normal">· {data.dateLabel}</span>
        </h2>
        <p className="text-xs text-mute mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          {counts.urgent > 0 ? `${counts.urgent} urgent · ` : ''}
          ~{data.estimatedMinutes} min to clear
        </p>
      </div>

      {totalItems === 0 ? (
        <div className="bg-card border border-rule rounded-lg p-8 text-center animate-fade-up">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm text-ink font-medium">Inbox zero.</p>
          <p className="text-xs text-mute mt-1">Take the rest of the day.</p>
        </div>
      ) : (
        <div className="space-y-4 stagger animate-fade-up">
          {/* URGENT */}
          {tiers.urgent.length > 0 && (
            <div className="bg-card border border-rule rounded-lg p-6">
              <TierHeader label="Urgent — Do first" tone="action" />
              <div className="space-y-2">
                {tiers.urgent.map(item => {
                  const meeting = item.ownerEmail
                    ? meetingsByEmail[item.ownerEmail.toLowerCase()]
                    : undefined
                  return (
                    <IntelliItem
                      key={item.id}
                      item={item}
                      meeting={meeting}
                      onOpen={() => onSelectItem(item)}
                      onStatusChange={(status, extra) => handleChange(item.id, status, extra)}
                    />
                  )
                })}
              </div>
              {counts.urgent > tiers.urgent.length && (
                <a
                  href="/queue?category=overdue_commitment"
                  className="inline-flex items-center text-xs text-mute hover:text-ink mt-3 transition-colors"
                >
                  Show all {counts.urgent}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </a>
              )}
            </div>
          )}

          {/* REPLY */}
          {(tiers.quickReply.length > 0 || tiers.deeperReply.length > 0) && (
            <div className="bg-card border border-rule rounded-lg p-6">
              <TierHeader label="Reply today" tone="ink" />

              {tiers.quickReply.length > 0 && (
                <div className="mb-4">
                  <p
                    className="text-[11px] text-mute mb-1.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Quick wins ({counts.quickReply}) — batch in ~{Math.max(1, Math.ceil(counts.quickReply))} min
                  </p>
                  <div className="space-y-0.5">
                    {tiers.quickReply.map(item => (
                      <IntelliItem
                        key={item.id}
                        item={item}
                        onOpen={() => onSelectItem(item)}
                        onStatusChange={(status, extra) => handleChange(item.id, status, extra)}
                        compact
                      />
                    ))}
                  </div>
                  {counts.quickReply > tiers.quickReply.length && (
                    <a
                      href="/queue?category=reply_needed"
                      className="inline-flex items-center text-xs text-mute hover:text-ink mt-2 transition-colors"
                    >
                      Show all {counts.quickReply}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </a>
                  )}
                </div>
              )}

              {tiers.deeperReply.length > 0 && (
                <div>
                  <p
                    className="text-[11px] text-mute mb-2"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Deeper replies ({counts.deeperReply}) — ~{counts.deeperReply * 3} min
                  </p>
                  <div className="space-y-2">
                    {tiers.deeperReply.map(item => {
                      const meeting = item.ownerEmail
                        ? meetingsByEmail[item.ownerEmail.toLowerCase()]
                        : undefined
                      return (
                        <IntelliItem
                          key={item.id}
                          item={item}
                          meeting={meeting}
                          onOpen={() => onSelectItem(item)}
                          onStatusChange={(status, extra) => handleChange(item.id, status, extra)}
                        />
                      )
                    })}
                  </div>
                  {counts.deeperReply > tiers.deeperReply.length && (
                    <a
                      href="/queue?category=reply_needed"
                      className="inline-flex items-center text-xs text-mute hover:text-ink mt-2 transition-colors"
                    >
                      Show all {counts.deeperReply}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHASE */}
          {tiers.chase.length > 0 && (
            <div className="bg-card border border-rule rounded-lg p-6">
              <TierHeader
                label={`Chase — They've gone quiet (${counts.chase})`}
                tone="mute"
              />
              <div className="space-y-0.5">
                {tiers.chase.map(item => (
                  <IntelliItem
                    key={item.id}
                    item={item}
                    onOpen={() => onSelectItem(item)}
                    onStatusChange={(status, extra) => handleChange(item.id, status, extra)}
                    compact
                  />
                ))}
              </div>
              {counts.chase > tiers.chase.length && (
                <a
                  href="/queue?category=waiting_on_them"
                  className="inline-flex items-center text-xs text-mute hover:text-ink mt-3 transition-colors"
                >
                  Show all {counts.chase}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </a>
              )}
              {!data.autoFollowupEnabled && (
                <a
                  href="/settings"
                  className="inline-flex items-center text-xs text-action hover:opacity-80 mt-3 ml-4 transition-opacity"
                >
                  Enable auto-followup
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </a>
              )}
            </div>
          )}

          {/* OTHER */}
          {tiers.other.length > 0 && (
            <div className="bg-card border border-rule rounded-lg p-6">
              <TierHeader label="Follow-ups due" tone="mute" />
              <div className="space-y-2">
                {tiers.other.map(item => {
                  const meeting = item.ownerEmail
                    ? meetingsByEmail[item.ownerEmail.toLowerCase()]
                    : undefined
                  return (
                    <IntelliItem
                      key={item.id}
                      item={item}
                      meeting={meeting}
                      onOpen={() => onSelectItem(item)}
                      onStatusChange={(status, extra) => handleChange(item.id, status, extra)}
                    />
                  )
                })}
              </div>
              {counts.other > tiers.other.length && (
                <a
                  href="/queue?category=followup_due"
                  className="inline-flex items-center text-xs text-mute hover:text-ink mt-3 transition-colors"
                >
                  Show all {counts.other}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Done today bar */}
      {data.doneToday > 0 && (
        <div
          className="mt-4 rounded-lg px-4 py-2.5 border animate-fade-up"
          style={{
            backgroundColor: 'rgb(26 143 94 / 10%)',
            borderColor: 'rgb(26 143 94 / 20%)',
          }}
        >
          <p className="text-xs text-done font-medium">
            {data.doneToday} done today — nice work
          </p>
        </div>
      )}
    </section>
  )
}
