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
  EyeOff,
  Settings,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/queue', label: 'Action Queue', icon: ListTodo },
  { href: '/queue?category=reply_needed', label: 'Reply Needed', icon: MessageSquare },
  { href: '/queue?category=waiting_on_them', label: 'Waiting on Them', icon: Clock },
  { href: '/queue?category=overdue_commitment', label: 'Overdue', icon: AlertTriangle },
  { href: '/queue?status=snoozed', label: 'Snoozed', icon: Archive },
  { href: '/queue?status=ignored', label: 'Ignored', icon: EyeOff },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-700">
        <Zap className="h-6 w-6 text-indigo-400" />
        <span className="text-lg font-bold">FollowUpOS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href.split('?')[0] && !item.href.includes('?')
            || pathname + location.search === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-6 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
