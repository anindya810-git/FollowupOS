'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  MessageSquare,
  AlertTriangle,
  Archive,
  Settings,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/queue', label: 'All Items', icon: ListTodo },
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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-60 flex-col bg-gray-950 text-gray-300">
      <div className="flex h-14 items-center px-5 border-b border-gray-800">
        <span className="text-sm font-semibold tracking-widest text-white uppercase">FollowUpOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navGroups.map(group => (
          <div key={group.label} className="mb-5">
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
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
                    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
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

      <div className="border-t border-gray-800 p-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors',
            pathname === '/settings'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          )}
        >
          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </div>
  )
}
