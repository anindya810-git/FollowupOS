'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { X, ExternalLink, Copy, Loader2, Check } from 'lucide-react'
import type { ActionItemWithThread } from '@/types'

interface ActionDrawerProps {
  item: ActionItemWithThread | null
  onClose: () => void
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
}

export function ActionDrawer({ item, onClose, onStatusChange }: ActionDrawerProps) {
  const [tone, setTone] = useState('polite')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detail, setDetail] = useState<ActionItemWithThread | null>(null)

  useEffect(() => {
    if (item) {
      setDetail(null)
      setDraft('')
      fetch(`/api/action-items/${item.id}`)
        .then(r => r.json())
        .then(d => setDetail(d.item))
    }
  }, [item?.id])

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
      setDraft(data.draft || 'Failed to generate draft.')
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const providerLabel = active.emailThread?.providerUrl?.includes('outlook') ? 'Outlook' : 'Gmail'

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-ink/20" onClick={onClose} />
      <div className="w-[540px] bg-white shadow-xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgb(11_18_32/8%)] px-6 py-4 flex items-center justify-between z-10">
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
            {active.ownerEmail && (
              <p className="text-sm text-[rgb(11_18_32/55%)] mt-1">{active.ownerName} · {active.ownerEmail}</p>
            )}
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-1">
              Last activity {timeAgo(active.lastActivityAt)}
            </p>
          </div>

          {/* Why */}
          <div className="bg-paper rounded-lg p-4 border border-[rgb(11_18_32/8%)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)] mb-1.5">Why this needs attention</p>
            <p className="text-sm text-ink">{active.reason}</p>
          </div>

          {/* Suggested action */}
          {active.suggestedAction && (
            <div className="bg-paper rounded-lg p-4 border border-[rgb(11_18_32/8%)]">
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
                  <div key={i} className="border border-[rgb(11_18_32/8%)] rounded-lg p-3 bg-paper">
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

          {/* Draft generator */}
          <div className="border border-[rgb(11_18_32/8%)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-paper border-b border-[rgb(11_18_32/8%)] flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)]">Generate Reply</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Select value={tone} onChange={e => setTone(e.target.value)} className="flex-1 text-sm">
                  <option value="polite">Polite</option>
                  <option value="firm">Firm</option>
                  <option value="short">Short</option>
                  <option value="executive">Executive</option>
                  <option value="friendly">Friendly</option>
                  <option value="escalation">Escalation</option>
                </Select>
                <Button onClick={generateReply} disabled={generating} size="sm">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate'}
                </Button>
              </div>
              {draft && (
                <div className="relative">
                  <pre className="whitespace-pre-wrap text-sm text-ink bg-paper border border-[rgb(11_18_32/8%)] rounded-md p-3 font-sans text-xs leading-relaxed">
                    {draft}
                  </pre>
                  <button
                    onClick={copy}
                    className="absolute top-2 right-2 flex items-center gap-1 text-[11px] text-[rgb(11_18_32/55%)] hover:text-ink bg-white border border-[rgb(11_18_32/10%)] rounded px-2 py-1 transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-[rgb(11_18_32/8%)] px-6 py-4 flex items-center gap-2">
          {active.emailThread?.providerUrl && (
            <Button variant="outline" size="sm" onClick={() => window.open(active.emailThread!.providerUrl!, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in {providerLabel}
            </Button>
          )}
          <Button variant="done" size="sm" onClick={() => { onStatusChange(item.id, 'done'); onClose() }}>
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
