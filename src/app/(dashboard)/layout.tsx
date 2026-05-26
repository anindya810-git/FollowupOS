'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { LogoMark } from '@/components/ui/Logo'
import { OpenInboxButton } from '@/components/layout/OpenInboxButton'
import { PendinglyLoader } from '@/components/ui/PendinglyLoader'

interface PlanInfo { type: string; isActive: boolean; daysLeft: number | null }

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  // Activate referral code from cookie after sign-in
  useEffect(() => {
    if (status !== 'authenticated') return
    const refCode = getCookie('pending_ref')
    if (!refCode) return
    deleteCookie('pending_ref')
    fetch('/api/referral/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: refCode }),
    }).catch(() => {})
  }, [status])

  // Load plan info for banner
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/plan').then(r => r.json()).then(setPlan).catch(() => {})
  }, [status])

  if (status === 'loading' || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper">
        <PendinglyLoader size={80} variant="light" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:static md:z-auto
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Suspense fallback={<div className="w-60 flex-shrink-0 bg-ink" />}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </Suspense>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Plan expiry banner — shown when ≤14 days left on free trial */}
        {!bannerDismissed && plan?.type === 'free' && plan.isActive && plan.daysLeft != null && plan.daysLeft <= 14 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex-shrink-0">
            <span>⏳ Your free trial expires in <strong>{plan.daysLeft} day{plan.daysLeft !== 1 ? 's' : ''}</strong>. <a href="/referral" className="underline font-medium">Refer friends</a> or <a href="/upgrade" className="underline font-medium">upgrade</a> to keep access.</span>
            <button onClick={() => setBannerDismissed(true)} className="flex-shrink-0 text-amber-600 hover:text-amber-900">✕</button>
          </div>
        )}
        {!bannerDismissed && plan && !plan.isActive && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-800 flex-shrink-0">
            <span>🔒 Your plan has expired. <a href="/upgrade" className="underline font-medium">Upgrade now</a> to restore full access.</span>
            <button onClick={() => setBannerDismissed(true)} className="flex-shrink-0 text-red-600 hover:text-red-900">✕</button>
          </div>
        )}
        <div className="flex items-center h-12 px-4 border-b border-rule bg-paper-2 md:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-md text-mute hover:text-ink hover:bg-ink-08 transition-colors"
            aria-label="Open menu"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="12" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <span className="ml-3 text-sm font-semibold text-ink tracking-tight">Pendingly</span>
          <div className="ml-auto">
            <OpenInboxButton variant="mobile" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
