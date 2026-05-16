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
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {onSync && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        )}
        <span className="text-sm text-gray-500">{userEmail}</span>
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
