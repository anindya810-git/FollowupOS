'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { ActionCard } from '@/components/action/ActionCard'
import { ActionDrawer } from '@/components/action/ActionDrawer'
import type { DashboardSummary, ActionItemWithThread } from '@/types'

const METRICS = [
  { key: 'reply_needed', label: 'Reply Needed', href: '/queue?category=reply_needed' },
  { key: 'followup_due', label: 'Follow-up Due', href: '/queue?category=followup_due' },
  { key: 'waiting_on_them', label: 'Waiting on Them', href: '/queue?category=waiting_on_them' },
  { key: 'overdue_commitments', label: 'Overdue', href: '/queue?category=overdue_commitment' },
  { key: 'high_priority', label: 'High Priority', href: '/queue?priority=high' },
  { key: 'snoozed', label: 'Snoozed', href: '/queue?status=snoozed' },
] as const

export function DashboardClient({ userEmail }: { userEmail: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [topItems, setTopItems] = useState<ActionItemWithThread[]>([])
  const [selected, setSelected] = useState<ActionItemWithThread | null>(null)

  const fetchData = async () => {
    const [s, t] = await Promise.all([
      fetch('/api/dashboard/summary').then(r => r.json()),
      fetch('/api/dashboard/top-priority').then(r => r.json()),
    ])
    setSummary(s)
    setTopItems(t.items || [])
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

  return (
    <>
      <Header title="Dashboard" userEmail={userEmail} onSync={fetchData} />
      <main className="p-6 max-w-4xl">
        {/* Metric grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {METRICS.map(({ key, label, href }) => (
            <a
              key={key}
              href={href}
              className="bg-white border border-gray-100 rounded-lg p-5 hover:border-gray-300 transition-colors group"
            >
              <p className="text-xs text-gray-400 mb-2 group-hover:text-gray-600 transition-colors">{label}</p>
              <p className="text-3xl font-semibold text-gray-900 tabular-nums">
                {summary ? (summary[key as keyof DashboardSummary] ?? 0) : '—'}
              </p>
            </a>
          ))}
        </div>

        {/* Top priority */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Top Priority</h2>
            <a href="/queue" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">View all →</a>
          </div>

          {topItems.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg p-12 text-center">
              <p className="text-gray-400 text-sm">No urgent follow-ups. You&apos;re clear.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topItems.map(item => (
                <ActionCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelected}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ActionDrawer item={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
    </>
  )
}
