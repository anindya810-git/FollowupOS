'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { ActionCard } from '@/components/action/ActionCard'
import { ActionDrawer } from '@/components/action/ActionDrawer'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { IntelliAction, type SerializedItem } from '@/components/dashboard/IntelliAction'
import type { DashboardSummary, ActionItemWithThread } from '@/types'

const METRICS = [
  { key: 'reply_needed', label: 'Reply Needed', href: '/queue?category=reply_needed' },
  { key: 'followup_due', label: 'Follow-up Due', href: '/queue?category=followup_due' },
  { key: 'waiting_on_them', label: 'Waiting on Them', href: '/queue?category=waiting_on_them' },
  { key: 'overdue_commitments', label: 'Overdue', href: '/queue?category=overdue_commitment' },
  { key: 'high_priority', label: 'High Priority', href: '/queue?priority=high' },
  { key: 'snoozed', label: 'Snoozed', href: '/queue?status=snoozed' },
] as const

export function DashboardClient({ userEmail, showOnboarding = false }: { userEmail: string; showOnboarding?: boolean }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [topItems, setTopItems] = useState<ActionItemWithThread[]>([])
  const [demandsItems, setDemandsItems] = useState<ActionItemWithThread[]>([])
  const [selected, setSelected] = useState<ActionItemWithThread | null>(null)
  const [meetingsByEmail, setMeetingsByEmail] = useState<Record<string, { subject: string; startTime: string }>>({})
  const [showTour, setShowTour] = useState(showOnboarding)

  const fetchData = async () => {
    const [s, t, d] = await Promise.all([
      fetch('/api/dashboard/summary').then(r => r.json()),
      fetch('/api/dashboard/top-priority').then(r => r.json()),
      fetch('/api/action-items?status=open&limit=5&repeated_asks=1').then(r => r.json()),
    ])
    setSummary(s)
    setTopItems(t.items || [])
    const all: ActionItemWithThread[] = d.items || []
    setDemandsItems(all.filter((i: ActionItemWithThread) => (i.repeatedAskCount ?? 0) >= 2))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    fetch('/api/calendar/meetings')
      .then(r => r.ok ? r.json() : { meetings: {} })
      .then(d => setMeetingsByEmail(d.meetings || {}))
      .catch(() => {})
  }, [])

  const handleStatusChange = async (id: string, status: string, extra?: Record<string, string>) => {
    await fetch(`/api/action-items/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    fetchData()
  }

  const handleSelectFromIntelli = async (s: SerializedItem) => {
    try {
      const res = await fetch(`/api/action-items/${s.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data?.item) setSelected(data.item)
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Header title="Dashboard" userEmail={userEmail} onSync={fetchData} />
      <main className="p-4 md:p-6 max-w-4xl">
        <IntelliAction
          onSelectItem={handleSelectFromIntelli}
          onStatusChange={handleStatusChange}
          meetingsByEmail={meetingsByEmail}
        />

        {/* Demanding Attention */}
        {demandsItems.length > 0 && (
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[11px] uppercase tracking-widest text-amber-700 font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                Demanding your attention
              </p>
            </div>
            <div className="space-y-2">
              {demandsItems.map(item => (
                <ActionCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>
        )}

        {/* At-a-glance metrics */}
        <p
          className="text-[11px] uppercase tracking-widest text-mute mb-3"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          At a glance
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8 stagger animate-fade-up">
          {METRICS.map(({ key, label, href }) => (
            <a
              key={key}
              href={href}
              className="card-lift bg-card border border-rule rounded-lg p-5 hover:border-[rgb(11_18_32/20%)] transition-colors group"
            >
              <p className="text-xs text-[rgb(11_18_32/55%)] mb-2">{label}</p>
              <p className="text-3xl font-semibold text-ink">
                <span className="animate-count tabular-nums">
                  {summary ? (summary[key as keyof DashboardSummary] ?? 0) : '—'}
                </span>
              </p>
            </a>
          ))}
        </div>

        {/* Top priority */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">Top Priority</h2>
            <a href="/queue" className="text-xs text-[rgb(11_18_32/30%)] hover:text-ink transition-colors">View all →</a>
          </div>

          {topItems.length === 0 ? (
            <div className="bg-card border border-rule rounded-lg p-12 text-center">
              <p className="text-[rgb(11_18_32/55%)] text-sm">No urgent follow-ups. You&apos;re clear.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topItems.map(item => {
                const meeting = item.ownerEmail ? meetingsByEmail[item.ownerEmail.toLowerCase()] : undefined
                return (
                  <ActionCard
                    key={item.id}
                    item={item}
                    meeting={meeting}
                    onStatusChange={handleStatusChange}
                    onSelect={setSelected}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>

      <ActionDrawer item={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />

      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
    </>
  )
}
