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
    <div className="flex h-14 items-center justify-between border-b border-[rgb(11_18_32/10%)] bg-paper px-6">
      <h1 className="text-sm font-semibold text-ink tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        {onSync && (
          <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          </Button>
        )}
        {userEmail && (
          <span className="text-xs text-[rgb(11_18_32/55%)] hidden sm:block">{userEmail}</span>
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
