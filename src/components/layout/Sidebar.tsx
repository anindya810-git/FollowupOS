'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/ui/Logo'
import { OpenInboxButton } from '@/components/layout/OpenInboxButton'
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  MessageSquare,
  AlertTriangle,
  Archive,
  Settings,
  BarChart2,
  HelpCircle,
  Gift,
  Zap,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/queue', label: 'All Items', icon: ListTodo },
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/referral', label: 'Referral', icon: Gift },
      { href: '/upgrade', label: 'Upgrade', icon: Zap },
    ],
  },
  {
    label: 'Categories',
    items: [
      { href: '/queue?category=reply_needed', label: 'Reply Needed', icon: MessageSquare },
      { href: '/queue?category=waiting_on_them', label: 'Waiting on Them', icon: Clock },
      { href: '/queue?category=overdue_commitment', label: 'Overdue', icon: AlertTriangle },
      { href: '/queue?status=snoozed', label: 'Snoozed', icon: Archive },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-60 flex-shrink-0 flex-col bg-ink text-white">
      <div className="flex h-14 items-center px-5 border-b border-[rgb(255_255_255/8%)]">
        <LogoMark className="h-6 w-6 mr-2.5 flex-shrink-0" variant="reversed" />
        <span className="text-xl font-semibold tracking-[-0.028em] leading-none text-white">Pendingly</span>
        <button onClick={onClose} className="ml-auto flex items-center justify-center w-8 h-8 rounded text-[#8C94A4] hover:text-white md:hidden" aria-label="Close menu">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="mb-5 px-0">
          <OpenInboxButton variant="sidebar" />
        </div>
        {navGroups.map(group => (
          <div key={group.label} className="mb-5">
            <p
              className="px-3 mb-1 uppercase text-[#8C94A4]"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em' }}
            >
              {group.label}
            </p>
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href.split('?')[0] && !item.href.includes('?')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2.5 md:py-2 text-sm rounded-md transition-all duration-150',
                    isActive
                      ? 'border-l-2 border-action bg-[rgb(255_255_255/8%)] text-white pl-[14px]'
                      : 'text-[#8C94A4] hover:text-white hover:bg-[rgb(255_255_255/5%)]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[rgb(255_255_255/8%)] p-2 space-y-0.5">
        <Link
          href="/help"
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 md:py-2 text-sm rounded-md transition-all duration-150',
            pathname === '/help'
              ? 'border-l-2 border-action bg-[rgb(255_255_255/8%)] text-white pl-[14px]'
              : 'text-[#8C94A4] hover:text-white hover:bg-[rgb(255_255_255/5%)]'
          )}
        >
          <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Help
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 md:py-2 text-sm rounded-md transition-all duration-150',
            pathname === '/settings'
              ? 'border-l-2 border-action bg-[rgb(255_255_255/8%)] text-white pl-[14px]'
              : 'text-[#8C94A4] hover:text-white hover:bg-[rgb(255_255_255/5%)]'
          )}
        >
          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </div>
  )
}
