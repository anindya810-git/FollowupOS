'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { LogoMark } from '@/components/ui/Logo'
import { OpenInboxButton } from '@/components/layout/OpenInboxButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  if (status === 'loading' || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper">
        <LogoMark className="h-8 w-8 animate-pulse-soft" />
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
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
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
