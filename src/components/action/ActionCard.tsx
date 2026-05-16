'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { categoryLabel, categoryColor, timeAgo, priorityColor } from '@/lib/utils'
import { ExternalLink, Clock, Check, EyeOff, ChevronRight } from 'lucide-react'
import type { ActionItemWithThread } from '@/types'

interface ActionCardProps {
  item: ActionItemWithThread
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
  onSelect: (item: ActionItemWithThread) => void
}

export function ActionCard({ item, onStatusChange, onSelect }: ActionCardProps) {
  const [loading, setLoading] = useState(false)

  const handleStatus = async (status: string, extra?: Record<string, string>) => {
    setLoading(true)
    await onStatusChange(item.id, status, extra)
    setLoading(false)
  }

  return (
    <div
      className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${categoryColor(item.category)}`}>
              {categoryLabel(item.category)}
            </span>
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${priorityColor(item.priority)}`} />
              <span className="text-xs text-gray-500 capitalize">{item.priority}</span>
            </span>
          </div>
          <h3 className="font-medium text-gray-900 truncate">
            {item.title || item.emailThread?.subject || 'No Subject'}
          </h3>
          {item.ownerName && (
            <p className="text-sm text-gray-600 mt-0.5">{item.ownerName} · {item.ownerEmail}</p>
          )}
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.reason}</p>
          {item.suggestedAction && (
            <p className="text-xs text-indigo-600 mt-1 font-medium">{item.suggestedAction}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {timeAgo(item.lastActivityAt || item.updatedAt)}
          </span>
          {item.dueDate && (
            <span className="text-xs text-orange-600">Due {item.dueDate}</span>
          )}
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 mt-1" />
        </div>
      </div>
      <div
        className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {item.emailThread?.providerUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(item.emailThread!.providerUrl!, '_blank')}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Gmail
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleStatus('snoozed', { snoozed_until: getTomorrow() })}
          disabled={loading}
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Snooze
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleStatus('done')}
          disabled={loading}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Done
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleStatus('ignored')}
          disabled={loading}
        >
          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
          Ignore
        </Button>
      </div>
    </div>
  )
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
