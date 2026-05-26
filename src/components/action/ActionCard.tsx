'use client'
import { useState, useRef, useEffect } from 'react'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { ExternalLink, Clock, Check, EyeOff, Calendar as CalendarIcon, AlertCircle, Archive, Link2, Paperclip, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playChime } from '@/lib/sounds'
import { SnoozeMenu } from './SnoozeMenu'
import type { ActionItemWithThread } from '@/types'

interface ActionCardProps {
  item: ActionItemWithThread
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
  onSelect: (item: ActionItemWithThread) => void
  selected?: boolean
  onSelectChange?: (checked: boolean) => void
  meeting?: { subject: string; startTime: string }
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

export function ActionCard({ item, onStatusChange, onSelect, selected, onSelectChange, meeting }: ActionCardProps) {
  const [loading, setLoading] = useState(false)
  const [ignoreOpen, setIgnoreOpen] = useState(false)
  const [ignoring, setIgnoring] = useState(false)
  const ignoreRef = useRef<HTMLDivElement>(null)

  const handle = async (status: string, extra?: Record<string, string>) => {
    setLoading(true)
    await onStatusChange(item.id, status, extra)
    setLoading(false)
  }

  // Close ignore popup when clicking outside
  useEffect(() => {
    if (!ignoreOpen) return
    const handler = (e: MouseEvent) => {
      if (ignoreRef.current && !ignoreRef.current.contains(e.target as Node)) {
        setIgnoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ignoreOpen])

  const lastInbound = item.emailThread?.messages?.find(m => !m.isFromUser)
  const senderEmail = lastInbound?.senderEmail || item.ownerEmail || ''
  const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : ''

  const ignoreSender = async (scope: 'email' | 'domain') => {
    setIgnoring(true)
    setIgnoreOpen(false)
    try {
      if (senderEmail) {
        const body = scope === 'email' ? { sender_email: senderEmail } : { domain: senderDomain }
        await fetch('/api/settings/ignored-senders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      await handle('ignored')
    } finally {
      setIgnoring(false)
    }
  }

  const selectable = typeof onSelectChange === 'function'

  // Pull link/attachment counts from the latest non-user message returned
  // by the list endpoint. Falls back to 0 when no message data attached.
  const latestMessage = item.emailThread?.messages?.[0]
  const linkCount = (() => {
    if (!latestMessage?.linksJson) return 0
    try { const arr = JSON.parse(latestMessage.linksJson); return Array.isArray(arr) ? arr.length : 0 } catch { return 0 }
  })()
  const attachmentCount = (() => {
    if (!latestMessage?.attachmentsJson) return 0
    try { const arr = JSON.parse(latestMessage.attachmentsJson); return Array.isArray(arr) ? arr.length : 0 } catch { return 0 }
  })()

  return (
    <div
      className="group animate-fade-up card-lift bg-white border border-[rgb(11_18_32/8%)] rounded-lg hover:border-[rgb(11_18_32/20%)] cursor-pointer relative"
      onClick={() => onSelect(item)}
    >
      {selectable && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!selected}
            onChange={e => onSelectChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-[rgb(11_18_32/20%)] text-action focus:ring-action cursor-pointer"
            aria-label="Select item"
          />
        </div>
      )}
      <div className={`p-4 ${selectable ? 'pl-10' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-medium bg-[rgb(11_18_32/6%)] text-ink px-2 py-0.5 rounded">
                {categoryLabel(item.category)}
              </span>
              {item.priority === 'high' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-action inline-block" />
                  High
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-ink truncate leading-snug">
              {item.title || item.emailThread?.subject || 'No Subject'}
            </p>
            {(() => {
              // Use last inbound message sender — ownerName can be the user's
              // own name when owner_type=user (wrong for display purposes).
              const inbound = item.emailThread?.messages?.find(m => !m.isFromUser)
              const displayName = inbound?.senderName || inbound?.senderEmail || ''
              return displayName ? (
                <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">{displayName}</p>
              ) : null
            })()}
            {item.reason && (
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-1.5 line-clamp-1">{item.reason}</p>
            )}
            {meeting && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-action font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
                <CalendarIcon className="h-2.5 w-2.5" />
                {formatMeetingTime(meeting.startTime)}
              </span>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {(item.repeatedAskCount ?? 0) >= 2 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded" style={{ fontFamily: 'var(--font-mono)' }}>
                  <AlertCircle className="h-2.5 w-2.5" />
                  {item.repeatedAskCount} asks
                </span>
              )}
              {item.needsClosure && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-[rgb(11_18_32/5%)] text-[rgb(11_18_32/50%)] border border-[rgb(11_18_32/10%)] px-1.5 py-0.5 rounded" style={{ fontFamily: 'var(--font-mono)' }}>
                  <Archive className="h-2.5 w-2.5" />
                  Ready to close
                </span>
              )}
              {attachmentCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium bg-[rgb(11_18_32/5%)] text-ink border border-[rgb(11_18_32/10%)] px-1.5 py-0.5 rounded hover:bg-[rgb(11_18_32/8%)] cursor-pointer"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  onClick={(e) => { e.stopPropagation(); onSelect(item) }}
                  title="View attachments"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  {attachmentCount}
                </span>
              )}
              {linkCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium bg-[rgb(11_18_32/5%)] text-ink border border-[rgb(11_18_32/10%)] px-1.5 py-0.5 rounded hover:bg-[rgb(11_18_32/8%)] cursor-pointer"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  onClick={(e) => { e.stopPropagation(); onSelect(item) }}
                  title="View links"
                >
                  <Link2 className="h-2.5 w-2.5" />
                  {linkCount}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] text-[rgb(11_18_32/30%)]">{timeAgo(item.lastActivityAt || item.updatedAt)}</p>
            {item.dueDate && (
              <p className="text-[11px] text-ink mt-0.5">Due {item.dueDate}</p>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-1 px-4 pb-3 border-t border-[rgb(11_18_32/6%)] pt-2.5"
        onClick={e => e.stopPropagation()}
      >
        {item.emailThread?.providerUrl && (
          <Button variant="ghost" size="sm" className="transition-all duration-150" onClick={() => window.open(item.emailThread!.providerUrl!, '_blank')}>
            <ExternalLink className="h-3 w-3 mr-1" />
            View in Inbox
          </Button>
        )}
        <SnoozeMenu
          onSelect={(d) => { playChime('info'); handle('snoozed', { snoozed_until: d }) }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="transition-all duration-150"
            disabled={loading}
          >
            <Clock className="h-3 w-3 mr-1" />
            Snooze
          </Button>
        </SnoozeMenu>
        <Button
          variant="ghost"
          size="sm"
          className="transition-all duration-150"
          onClick={() => { playChime('done'); handle('done') }}
          disabled={loading}
        >
          <Check className="h-3 w-3 mr-1" />
          Done
        </Button>
        <div ref={ignoreRef} className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="transition-all duration-150"
            onClick={(e) => { e.stopPropagation(); setIgnoreOpen(o => !o) }}
            disabled={loading || ignoring}
          >
            <EyeOff className="h-3 w-3 mr-1" />
            Ignore
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
          {ignoreOpen && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-rule rounded-lg shadow-lg z-50 min-w-[200px] py-1 text-xs">
              <button
                className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink"
                onClick={(e) => { e.stopPropagation(); ignoreSender('email') }}
              >
                <span className="font-medium">Ignore this sender</span>
                {senderEmail && <span className="block text-[rgb(11_18_32/40%)] truncate">{senderEmail}</span>}
              </button>
              {senderDomain && (
                <button
                  className="w-full text-left px-3 py-2 hover:bg-paper-2 text-ink border-t border-rule"
                  onClick={(e) => { e.stopPropagation(); ignoreSender('domain') }}
                >
                  <span className="font-medium">Ignore all from @{senderDomain}</span>
                  <span className="block text-[rgb(11_18_32/40%)]">Every email from this domain</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
