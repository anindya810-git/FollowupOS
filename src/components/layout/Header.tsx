'use client'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, RefreshCw, ChevronDown, RotateCcw, Loader2, Check, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface ConnectedAccount {
  id: string
  emailAddress: string
  provider: string
  connectedStatus: string
}

interface UserProfile {
  name: string | null
  email: string
  image: string | null
}

interface HeaderProps {
  title: string
  userEmail?: string
  onSync?: () => void
}

const PROVIDER_SHORT: Record<string, string> = {
  gmail: 'G',
  outlook: 'O',
  zoho: 'Z',
  apple: 'A',
  imap: 'I',
}

const PROVIDER_COLOR: Record<string, string> = {
  gmail: 'bg-red-100 text-red-700',
  outlook: 'bg-blue-100 text-blue-700',
  zoho: 'bg-orange-100 text-orange-700',
  apple: 'bg-zinc-100 text-zinc-600',
  imap: 'bg-purple-100 text-purple-700',
}

export function Header({ title, onSync }: HeaderProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanDone, setScanDone] = useState(false)
  const [scanStarted, setScanStarted] = useState(false)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const avatarMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : { accounts: [] })
      .then(d => setAccounts((d.accounts ?? []).filter((a: ConnectedAccount) => a.connectedStatus === 'connected')))
      .catch(() => {})
    fetch('/api/user/profile')
      .then(r => r.ok ? r.json() : null)
      .then((d: UserProfile | null) => { if (d) setProfile(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    if (!avatarMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) setAvatarMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarMenuOpen])

  const handleRefresh = async () => {
    if (!onSync) return
    setSyncing(true)
    await onSync()
    setSyncing(false)
  }

  const triggerScan = async (forceFullRescan = false) => {
    setMenuOpen(false)
    setScanBusy(true); setScanDone(false)
    try {
      const targets = accounts.length > 0 ? accounts : (await fetch('/api/integrations').then(r => r.json()).then(d => d.accounts ?? []))
      await Promise.all(
        targets.map((a: ConnectedAccount) =>
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
      'Reset scan history for all inboxes?\n\nRe-evaluates every email in the scan window from scratch.\n\nExisting action items are NOT deleted.'
    )) return
    triggerScan(true)
  }

  const initials = profile
    ? (profile.name || profile.email).slice(0, 1).toUpperCase()
    : '?'

  return (
    <div className="flex h-14 items-center justify-between border-b border-rule bg-paper-2 px-6">
      <h1 className="text-sm font-semibold text-ink tracking-tight">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Connected inbox chips */}
        {accounts.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            {accounts.map(a => (
              <button
                key={a.id}
                onClick={() => router.push('/settings')}
                title={`${a.emailAddress} (${a.provider})`}
                className="flex items-center gap-1 text-[11px] border border-[rgb(11_18_32/12%)] rounded-full px-2 py-0.5 hover:border-[rgb(11_18_32/25%)] hover:bg-paper transition-colors"
              >
                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold ${PROVIDER_COLOR[a.provider] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {PROVIDER_SHORT[a.provider] ?? 'M'}
                </span>
                <span className="text-[rgb(11_18_32/60%)] max-w-[130px] truncate font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                  {a.emailAddress}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* View progress link — appears after a scan is triggered */}
        {scanStarted && (
          <button
            onClick={() => router.push('/settings')}
            className="text-[11px] text-action hover:underline flex items-center gap-1 animate-fade-up whitespace-nowrap"
          >
            View progress →
          </button>
        )}

        {/* Split sync button (only shown if onSync is provided) */}
        {onSync && (
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
                <button onClick={() => triggerScan(false)} className="w-full text-left px-3 py-2 hover:bg-paper-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-[rgb(11_18_32/45%)]" />
                    <div>
                      <p className="text-sm font-medium text-ink">Sync now</p>
                      <p className="text-[11px] text-[rgb(11_18_32/45%)]">Fetch only new emails since last scan</p>
                    </div>
                  </div>
                </button>
                <div className="mx-3 border-t border-[rgb(11_18_32/8%)]" />
                <button onClick={handleReset} className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors">
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
        )}

        {/* Avatar with dropdown */}
        <div ref={avatarMenuRef} className="relative">
          <button
            onClick={() => setAvatarMenuOpen(o => !o)}
            className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[rgb(11_18_32/15%)] transition-all focus:outline-none"
            title={profile?.name ?? profile?.email ?? 'Account'}
          >
            {profile?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="h-full w-full flex items-center justify-center bg-[rgb(11_18_32/10%)] text-xs font-semibold text-ink">
                {initials}
              </span>
            )}
          </button>

          {avatarMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-ink rounded-xl shadow-2xl w-60 overflow-hidden border border-[rgb(255_255_255/8%)]">
              {/* User info */}
              <div className="px-4 py-3.5 border-b border-[rgb(255_255_255/8%)]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 ring-2 ring-[rgb(255_255_255/12%)]">
                    {profile?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="h-full w-full flex items-center justify-center bg-[rgb(255_255_255/12%)] text-xs font-bold text-white">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {profile?.name && <p className="text-sm font-semibold text-white truncate">{profile.name}</p>}
                    <p className="text-[11px] text-[rgb(255_255_255/45%)] truncate mt-0.5">{profile?.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <button
                  onClick={() => { setAvatarMenuOpen(false); router.push('/settings?section=account') }}
                  className="w-full text-left px-4 py-2 hover:bg-[rgb(255_255_255/6%)] transition-colors flex items-center gap-3 group"
                >
                  <Settings className="h-3.5 w-3.5 text-[rgb(255_255_255/40%)] group-hover:text-[rgb(255_255_255/70%)] transition-colors" />
                  <span className="text-sm text-[rgb(255_255_255/70%)] group-hover:text-white transition-colors">Account settings</span>
                </button>
                <button
                  onClick={() => { setAvatarMenuOpen(false); router.push('/settings') }}
                  className="w-full text-left px-4 py-2 hover:bg-[rgb(255_255_255/6%)] transition-colors flex items-center gap-3 group"
                >
                  <Settings className="h-3.5 w-3.5 text-[rgb(255_255_255/40%)] group-hover:text-[rgb(255_255_255/70%)] transition-colors" />
                  <span className="text-sm text-[rgb(255_255_255/70%)] group-hover:text-white transition-colors">Settings</span>
                </button>
              </div>

              <div className="border-t border-[rgb(255_255_255/8%)] py-1.5">
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full text-left px-4 py-2 hover:bg-[rgb(255_255_255/6%)] transition-colors flex items-center gap-3 group"
                >
                  <LogOut className="h-3.5 w-3.5 text-[rgb(255_100_80/60%)] group-hover:text-[rgb(255_100_80/90%)] transition-colors" />
                  <span className="text-sm text-[rgb(255_100_80/70%)] group-hover:text-[rgb(255_100_80/95%)] transition-colors">Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
