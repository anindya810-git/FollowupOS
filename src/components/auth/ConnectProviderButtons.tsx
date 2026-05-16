'use client'
import { useState } from 'react'
import { Loader2, Server } from 'lucide-react'
import { ImapConnectForm } from './ImapConnectForm'

type OAuthProvider = 'gmail' | 'outlook'
type ImapProvider = 'zoho' | 'apple' | 'imap'
type AnyProvider = OAuthProvider | ImapProvider

export function ConnectProviderButtons() {
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [activeImap, setActiveImap] = useState<ImapProvider | null>(null)

  const connectOAuth = (provider: OAuthProvider) => {
    setOauthLoading(provider)
    window.location.href = `/api/integrations/${provider}/connect`
  }

  const toggleImap = (provider: ImapProvider) => {
    setActiveImap(prev => (prev === provider ? null : provider))
  }

  return (
    <div className="space-y-3">
      {/* OAuth providers */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => connectOAuth('gmail')}
          disabled={!!oauthLoading}
          className="flex flex-col items-center gap-3 rounded-lg border border-[rgb(11_18_32/10%)] bg-white p-6 text-center hover:border-ink hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {oauthLoading === 'gmail' ? (
            <Loader2 className="h-8 w-8 animate-spin text-[rgb(11_18_32/30%)]" />
          ) : (
            <svg className="h-8 w-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <div>
            <p className="text-sm font-semibold text-ink">{oauthLoading === 'gmail' ? 'Connecting…' : 'Gmail'}</p>
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-0.5">Google Workspace</p>
          </div>
        </button>

        <button
          onClick={() => connectOAuth('outlook')}
          disabled={!!oauthLoading}
          className="flex flex-col items-center gap-3 rounded-lg border border-[rgb(11_18_32/10%)] bg-white p-6 text-center hover:border-ink hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {oauthLoading === 'outlook' ? (
            <Loader2 className="h-8 w-8 animate-spin text-[rgb(11_18_32/30%)]" />
          ) : (
            <svg className="h-8 w-8" viewBox="0 0 24 24">
              <rect x="1" y="1" width="10" height="10" rx="1.5" fill="#F25022"/>
              <rect x="13" y="1" width="10" height="10" rx="1.5" fill="#7FBA00"/>
              <rect x="1" y="13" width="10" height="10" rx="1.5" fill="#00A4EF"/>
              <rect x="13" y="13" width="10" height="10" rx="1.5" fill="#FFB900"/>
            </svg>
          )}
          <div>
            <p className="text-sm font-semibold text-ink">{oauthLoading === 'outlook' ? 'Connecting…' : 'Outlook'}</p>
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-0.5">Microsoft 365</p>
          </div>
        </button>
      </div>

      {/* IMAP providers */}
      <div className="grid grid-cols-3 gap-3">
        {/* Zoho */}
        <button
          onClick={() => toggleImap('zoho')}
          disabled={!!oauthLoading}
          className={`flex flex-col items-center gap-3 rounded-lg border bg-white p-5 text-center hover:border-ink hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${activeImap === 'zoho' ? 'border-ink shadow-sm' : 'border-[rgb(11_18_32/10%)]'}`}
        >
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-ink text-paper text-lg font-bold">
            Z
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Zoho Mail</p>
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-0.5">IMAP</p>
          </div>
        </button>

        {/* Apple Mail */}
        <button
          onClick={() => toggleImap('apple')}
          disabled={!!oauthLoading}
          className={`flex flex-col items-center gap-3 rounded-lg border bg-white p-5 text-center hover:border-ink hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${activeImap === 'apple' ? 'border-ink shadow-sm' : 'border-[rgb(11_18_32/10%)]'}`}
        >
          <div className="h-8 w-8 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Apple Mail</p>
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-0.5">iCloud IMAP</p>
          </div>
        </button>

        {/* Generic IMAP */}
        <button
          onClick={() => toggleImap('imap')}
          disabled={!!oauthLoading}
          className={`flex flex-col items-center gap-3 rounded-lg border bg-white p-5 text-center hover:border-ink hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${activeImap === 'imap' ? 'border-ink shadow-sm' : 'border-[rgb(11_18_32/10%)]'}`}
        >
          <Server className="h-8 w-8 text-ink" />
          <div>
            <p className="text-sm font-semibold text-ink">Other</p>
            <p className="text-xs text-[rgb(11_18_32/30%)] mt-0.5">Generic IMAP</p>
          </div>
        </button>
      </div>

      {/* Inline IMAP form */}
      {activeImap && <ImapConnectForm initialProvider={activeImap} />}
    </div>
  )
}
