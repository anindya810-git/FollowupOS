'use client'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, RefreshCw, ChevronDown, RotateCcw, Loader2, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface HeaderProps {
  title: string
  userEmail?: string
  onSync?: () => void
}

export function Header({ title, userEmail, onSync }: HeaderProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanDone, setScanDone] = useState(false)
  const [scanStarted, setScanStarted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleRefresh = async () => {
    if (!onSync) return
    setSyncing(true)
    await onSync()
    setSyncing(false)
  }

  const triggerScan = async (forceFullRescan = false) => {
    setMenuOpen(false)
    setScanBusy(true)
    setScanDone(false)
    try {
      const res = await fetch('/api/integrations')
      const data = await res.json()
      const accounts: Array<{ id: string }> = data.accounts ?? []
      await Promise.all(
        accounts.map(a =>
          fetch('/api/scan/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: a.id, ...(forceFullRescan ? { force_full_rescan: true } : {}) }),
          })
        )
      )
      setScanDone(true)
      setScanStarted(true)
      setTimeout(() => setScanDone(false), 3000)
      onSync?.()
    } finally {
      setScanBusy(false)
    }
  }

  const handleReset = () => {
    setMenuOpen(false)
    if (!confirm(
      'Reset scan history for all inboxes?\n\n' +
      'Re-evaluates every email in the scan window from scratch — including ones previously skipped.\n\n' +
      'Existing action items are NOT deleted.'
    )) return
    triggerScan(true)
  }

  if (!onSync) {
    return (
      <div className="flex h-14 items-center justify-between border-b border-rule bg-paper-2 px-6">
        <h1 className="text-sm font-semibold text-ink tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {userEmail && (
            <span className="text-xs text-mute hidden sm:block" style={{ fontFamily: 'var(--font-mono)' }}>
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

  return (
    <div className="flex h-14 items-center justify-between border-b border-rule bg-paper-2 px-6">
      <h1 className="text-sm font-semibold text-ink tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        {/* View progress link — appears after a scan is triggered */}
        {scanStarted && (
          <button
            onClick={() => router.push('/settings')}
            className="text-[11px] text-action hover:underline flex items-center gap-1 animate-fade-up"
          >
            View progress →
          </button>
        )}
        {/* Split sync button */}
        <div ref={menuRef} className="relative flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={syncing || scanBusy}
            className="rounded-r-none pr-2"
            title="Refresh dashboard data"
          >
            {syncing || scanBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : scanDone ? (
              <Check className="h-3.5 w-3.5 text-done" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(o => !o)}
            disabled={syncing || scanBusy}
            className="rounded-l-none pl-0.5 pr-1"
            title="More sync options"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[rgb(11_18_32/12%)] rounded-lg shadow-lg w-64 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/35%)]">Sync options</p>
              </div>
              <button
                onClick={() => triggerScan(false)}
                className="w-full text-left px-3 py-2 hover:bg-paper-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-[rgb(11_18_32/45%)]" />
                  <div>
                    <p className="text-sm font-medium text-ink">Sync now</p>
                    <p className="text-[11px] text-[rgb(11_18_32/45%)]">Fetch only new emails since last scan</p>
                  </div>
                </div>
              </button>
              <div className="mx-3 border-t border-[rgb(11_18_32/8%)]" />
              <button
                onClick={handleReset}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">Reset &amp; rescan</p>
                    <p className="text-[11px] text-amber-600/70">Re-evaluate all emails from scratch</p>
                  </div>
                </div>
              </button>
              <div className="px-3 pb-2.5 pt-1">
                <p className="text-[10px] text-[rgb(11_18_32/35%)]">Applies to all connected inboxes</p>
              </div>
            </div>
          )}
        </div>

        {userEmail && (
          <span className="text-xs text-mute hidden sm:block" style={{ fontFamily: 'var(--font-mono)' }}>
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
