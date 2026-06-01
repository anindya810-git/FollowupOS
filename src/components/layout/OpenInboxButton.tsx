'use client'
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, ChevronDown, Mail } from 'lucide-react'
import { getInboxUrl } from '@/lib/inbox-urls'
import { GoogleCalendarLogo, OutlookCalendarLogo, AppleCalendarLogo, ZohoMailLogo } from '@/components/icons/BrandLogos'

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case 'gmail':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white">
          <GoogleCalendarLogo className="h-3.5 w-3.5" />
        </span>
      )
    case 'outlook':
      return <OutlookCalendarLogo className="h-5 w-5 shrink-0 rounded" />
    case 'apple':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white">
          <AppleCalendarLogo className="h-3.5 w-3.5" />
        </span>
      )
    case 'zoho':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white">
          <ZohoMailLogo className="h-4 w-4" />
        </span>
      )
    default:
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[rgb(255_255_255/12%)]">
          <Mail className="h-3 w-3 text-[rgb(255_255_255/60%)]" />
        </span>
      )
  }
}

interface Account {
  id: string
  provider: string
  emailAddress: string
  webmailBaseUrl?: string | null
  connectedStatus?: string
}

interface OpenInboxButtonProps {
  variant?: 'sidebar' | 'mobile'
}

const providerLabel: Record<string, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  zoho: 'Zoho',
  apple: 'iCloud',
  imap: 'Webmail',
}

export function OpenInboxButton({ variant = 'sidebar' }: OpenInboxButtonProps) {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const cached = localStorage.getItem('pendingly_integrations')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.accounts) {
          setAccounts(d.accounts)
          try { localStorage.setItem('pendingly_integrations', JSON.stringify(d.accounts)) } catch {}
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const usable = accounts.filter(a =>
    (a.connectedStatus ?? 'connected') === 'connected' && getInboxUrl(a) !== null
  )
  if (usable.length === 0) return null

  const isSidebar = variant === 'sidebar'

  const triggerClass = isSidebar
    ? 'w-full flex items-center gap-2.5 px-4 py-2.5 md:py-2 text-sm rounded-md text-[#8C94A4] hover:text-white hover:bg-[rgb(255_255_255/5%)] transition-all duration-150'
    : 'flex items-center gap-1.5 px-2.5 h-8 text-xs rounded-md text-mute hover:text-ink hover:bg-ink-08 transition-colors'

  if (usable.length === 1) {
    const account = usable[0]
    const url = getInboxUrl(account)!
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={triggerClass}
        title={`Open ${account.emailAddress} in ${providerLabel[account.provider] || 'webmail'}`}
      >
        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
        <span className={isSidebar ? '' : 'hidden sm:inline'}>Open Inbox</span>
        {isSidebar && <ExternalLink className="h-3 w-3 ml-auto opacity-60" />}
      </a>
    )
  }

  // Multiple inboxes — sidebar expands inline, mobile uses a popup dropdown
  if (isSidebar) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={triggerClass}
        >
          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Open Inbox</span>
          <ChevronDown className={`h-3 w-3 ml-auto opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {usable.map(account => {
              const url = getInboxUrl(account)!
              return (
                <a
                  key={account.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 pl-6 pr-4 py-1.5 rounded-md text-xs text-[#8C94A4] hover:text-white hover:bg-[rgb(255_255_255/5%)] transition-colors"
                >
                  <ProviderIcon provider={account.provider} />
                  <span className="truncate flex-1">{account.emailAddress}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                </a>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={triggerClass}
      >
        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">Open Inbox</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[220px] bg-white border border-[rgb(11_18_32/10%)] rounded-md shadow-lg py-1 z-50">
          {usable.map(account => {
            const url = getInboxUrl(account)!
            return (
              <a
                key={account.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-paper-2 transition-colors"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[rgb(11_18_32/8%)] bg-white shadow-sm">
                  {account.provider === 'gmail' && <GoogleCalendarLogo className="h-4 w-4" />}
                  {account.provider === 'outlook' && <OutlookCalendarLogo className="h-4 w-4" />}
                  {account.provider === 'apple' && <AppleCalendarLogo className="h-4 w-4" />}
                  {account.provider === 'zoho' && <ZohoMailLogo className="h-4 w-4" />}
                  {!['gmail','outlook','apple','zoho'].includes(account.provider) && <Mail className="h-3 w-3 text-[rgb(11_18_32/45%)]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate">{account.emailAddress}</p>
                  <p className="text-[10px] text-[rgb(11_18_32/50%)] uppercase tracking-wide">
                    {providerLabel[account.provider] || account.provider}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-[rgb(11_18_32/40%)] flex-shrink-0" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
