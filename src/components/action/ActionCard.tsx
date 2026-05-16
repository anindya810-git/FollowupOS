'use client'
import { useState } from 'react'
import { categoryLabel, timeAgo } from '@/lib/utils'
import { ExternalLink, Clock, Check, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      className="group bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-all cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {categoryLabel(item.category)}
              </span>
              {item.priority === 'high' && (
                <span className="text-[11px] font-medium text-gray-900">↑ High</span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 truncate leading-snug">
              {item.title || item.emailThread?.subject || 'No Subject'}
            </p>
            {item.ownerName && (
              <p className="text-xs text-gray-500 mt-0.5">{item.ownerName}</p>
            )}
            {item.reason && (
              <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">{item.reason}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] text-gray-400">{timeAgo(item.lastActivityAt || item.updatedAt)}</p>
            {item.dueDate && (
              <p className="text-[11px] text-gray-600 mt-0.5">Due {item.dueDate}</p>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-1 px-4 pb-3 border-t border-gray-50 pt-2.5"
        onClick={e => e.stopPropagation()}
      >
        {item.emailThread?.providerUrl && (
          <Button variant="ghost" size="sm" onClick={() => window.open(item.emailThread!.providerUrl!, '_blank')}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => handle('snoozed', { snoozed_until: tomorrow() })} disabled={loading}>
          <Clock className="h-3 w-3 mr-1" />
          Snooze
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handle('done')} disabled={loading}>
          <Check className="h-3 w-3 mr-1" />
          Done
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handle('ignored')} disabled={loading}>
          <EyeOff className="h-3 w-3 mr-1" />
          Ignore
        </Button>
      </div>
    </div>
  )
}
