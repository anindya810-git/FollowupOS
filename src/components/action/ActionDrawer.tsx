'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { categoryLabel, categoryColor, timeAgo, priorityColor } from '@/lib/utils'
import { X, ExternalLink, Copy, Loader2 } from 'lucide-react'
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

  const activeItem = detail || item

  const generateReply = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/action-items/${item.id}/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, output_type: 'email_reply' }),
      })
      const data = await res.json()
      if (data.draft) setDraft(data.draft)
    } catch {
      setDraft('Failed to generate draft.')
    } finally {
      setGenerating(false)
    }
  }

  const copyDraft = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[560px] bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Action Detail</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Category & Priority */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${categoryColor(activeItem.category)}`}>
              {categoryLabel(activeItem.category)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${priorityColor(activeItem.priority)}`} />
              {activeItem.priority} priority
            </span>
          </div>

          {/* Subject */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {activeItem.title || activeItem.emailThread?.subject}
            </h3>
            {activeItem.ownerEmail && (
              <p className="text-sm text-gray-500 mt-1">{activeItem.ownerName} · {activeItem.ownerEmail}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Last activity: {timeAgo(activeItem.lastActivityAt)}
            </p>
          </div>

          {/* Reason */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">Why this needs attention</p>
            <p className="text-sm text-amber-700">{activeItem.reason}</p>
          </div>

          {/* Suggested Action */}
          {activeItem.suggestedAction && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
              <p className="text-sm font-medium text-indigo-800 mb-1">Suggested action</p>
              <p className="text-sm text-indigo-700">{activeItem.suggestedAction}</p>
            </div>
          )}

          {/* Recent Messages */}
          {activeItem.emailThread?.messages && activeItem.emailThread.messages.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Recent messages</p>
              <div className="space-y-2">
                {activeItem.emailThread.messages.slice(-3).map((msg, i) => (
                  <div key={i} className="rounded-md bg-gray-50 p-3 text-sm">
                    <p className="font-medium text-gray-700">
                      {msg.isFromUser ? 'You' : msg.senderName || msg.senderEmail}
                      {msg.sentAt && <span className="text-gray-400 font-normal ml-2">{timeAgo(msg.sentAt)}</span>}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs line-clamp-3">
                      {msg.bodyExcerpt || msg.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Generator */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Generate Reply</p>
            <div className="flex gap-2 mb-3">
              <Select value={tone} onChange={e => setTone(e.target.value)} className="flex-1">
                <option value="polite">Polite</option>
                <option value="firm">Firm</option>
                <option value="short">Short</option>
                <option value="executive">Executive</option>
                <option value="friendly">Friendly</option>
                <option value="escalation">Escalation</option>
              </Select>
              <Button onClick={generateReply} disabled={generating}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </div>
            {draft && (
              <div className="relative">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-md p-3 font-sans">
                  {draft}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copyDraft}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {activeItem.emailThread?.providerUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(activeItem.emailThread!.providerUrl!, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Gmail
              </Button>
            )}
            <Button onClick={() => { onStatusChange(item.id, 'done'); onClose() }}>
              Mark Done
            </Button>
            <Button variant="outline" onClick={() => { onStatusChange(item.id, 'ignored'); onClose() }}>
              Ignore
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
