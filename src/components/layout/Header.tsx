'use client'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title: string
  userEmail?: string
  onSync?: () => void
}

export function Header({ title, userEmail, onSync }: HeaderProps) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    if (!onSync) return
    setSyncing(true)
    await onSync()
    setSyncing(false)
  }

  return (
    <div className="flex h-14 items-center justify-between border-b border-rule bg-paper-2 px-6">
      <h1 className="text-sm font-semibold text-ink tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        {onSync && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            title="Refresh — re-fetches your latest action items and dashboard data"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          </Button>
        )}
        {userEmail && (
          <span
            className="text-xs text-mute hidden sm:block"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {userEmail}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
