'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { ActionCard } from '@/components/action/ActionCard'
import { ActionDrawer } from '@/components/action/ActionDrawer'
import { MessageSquare, Clock, AlertTriangle, ListTodo, Star, Archive } from 'lucide-react'
import type { DashboardSummary, ActionItemWithThread } from '@/types'

interface DashboardClientProps {
  userEmail: string
  userName: string
}

export function DashboardClient({ userEmail }: DashboardClientProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [topItems, setTopItems] = useState<ActionItemWithThread[]>([])
  const [selectedItem, setSelectedItem] = useState<ActionItemWithThread | null>(null)

  const fetchData = async () => {
    const [summaryRes, topRes] = await Promise.all([
      fetch('/api/dashboard/summary').then(r => r.json()),
      fetch('/api/dashboard/top-priority').then(r => r.json()),
    ])
    setSummary(summaryRes)
    setTopItems(topRes.items || [])
  }

  useEffect(() => { fetchData() }, [])

  const handleStatusChange = async (id: string, status: string, extra?: Record<string, string>) => {
    await fetch(`/api/action-items/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    fetchData()
  }

  const metrics = [
    { label: 'Reply Needed', value: summary?.reply_needed ?? 0, icon: MessageSquare, color: 'text-red-600', bg: 'bg-red-50', href: '/queue?category=reply_needed' },
    { label: 'Follow-up Due', value: summary?.followup_due ?? 0, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/queue?category=followup_due' },
    { label: 'Waiting on Them', value: summary?.waiting_on_them ?? 0, icon: ListTodo, color: 'text-blue-600', bg: 'bg-blue-50', href: '/queue?category=waiting_on_them' },
    { label: 'Overdue', value: summary?.overdue_commitments ?? 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', href: '/queue?category=overdue_commitment' },
    { label: 'High Priority', value: summary?.high_priority ?? 0, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50', href: '/queue?priority=high' },
    { label: 'Snoozed', value: summary?.snoozed ?? 0, icon: Archive, color: 'text-gray-600', bg: 'bg-gray-50', href: '/queue?status=snoozed' },
  ]

  return (
    <>
      <Header title="Dashboard" userEmail={userEmail} onSync={fetchData} />
      <main className="p-6">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {metrics.map(({ label, value, icon: Icon, color, bg, href }) => (
            <a key={label} href={href} className="block rounded-xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{label}</span>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </a>
          ))}
        </div>

        {/* Top Priority */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Priority Today</h2>
          {topItems.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg">No urgent follow-ups found. You are clear for now.</p>
              <p className="text-gray-400 text-sm mt-1">Connect Gmail to start scanning your inbox.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topItems.map(item => (
                <ActionCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ActionDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  )
}
