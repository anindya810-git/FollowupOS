'use client'
import { useState } from 'react'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { ExternalLink, Clock, Check, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playChime } from '@/lib/sounds'
import type { ActionItemWithThread } from '@/types'

interface ActionCardProps {
  item: ActionItemWithThread
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
  onSelect: (item: ActionItemWithThread) => void
}

export function ActionCard({ item, onStatusChange, onSelect }: ActionCardProps) {
  const [loading, setLoading] = useState(false)

  const handle = async (status: string, extra?: Record<string, string>) => {
    setLoading(true)
    await onStatusChange(item.id, status, extra)
    setLoading(false)
  }

  const tomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  return (
    <div
      className="group animate-fade-up card-lift bg-white border border-[rgb(11_18_32/8%)] rounded-lg hover:border-[rgb(11_18_32/20%)] cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="p-4">
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
            {item.ownerName && (
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">{item.ownerName}</p>
            )}
            {item.reason && (
              <p className="text-xs text-[rgb(11_18_32/55%)] mt-1.5 line-clamp-1">{item.reason}</p>
            )}
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
            Open
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="transition-all duration-150"
          onClick={() => { playChime('info'); handle('snoozed', { snoozed_until: tomorrow() }) }}
          disabled={loading}
        >
          <Clock className="h-3 w-3 mr-1" />
          Snooze
        </Button>
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
        <Button
          variant="ghost"
          size="sm"
          className="transition-all duration-150"
          onClick={() => handle('ignored')}
          disabled={loading}
        >
          <EyeOff className="h-3 w-3 mr-1" />
          Ignore
        </Button>
      </div>
    </div>
  )
}
