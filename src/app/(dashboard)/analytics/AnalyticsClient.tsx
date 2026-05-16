'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { StatCard } from '@/components/charts/StatCard'
import { categoryLabel } from '@/lib/utils'

interface SummaryData {
  healthScore: number
  totalOpen: number
  resolvedThisWeek: number
  avgTatDays: number
  overdueCount: number
  topCategory: string | null
  weekOverWeekChange: number
}

interface TrendsData {
  volumeByDay: Array<{ date: string; count: number }>
  resolvedByDay: Array<{ date: string; count: number }>
  overdueByWeek: Array<{ week: string; count: number }>
}

interface TatData {
  byCategory: Array<{ category: string; avgDays: number; count: number }>
  overall: number
}

interface BreakdownData {
  byCategory: Array<{ category: string; open: number; done: number; snoozed: number; ignored: number }>
  byStatus: Array<{ status: string; count: number }>
  byDayOfWeek: Array<{ day: number; label: string; count: number }>
  topContacts: Array<{ ownerEmail: string; ownerName: string | null; count: number }>
}

const CATEGORY_COLORS: Record<string, string> = {
  reply_needed: '#F25A3C',
  waiting_on_them: '#0B1220',
  followup_due: '#1A8F5E',
  commitment_detected: '#5B6473',
  overdue_commitment: '#C05020',
  no_action_needed: '#C0BAB0',
}

function HealthRing({ score }: { score: number }) {
  const size = 120
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 10
  const circumference = 2 * Math.PI * r
  const progress = (score / 100) * circumference
  const color = score >= 70 ? '#1A8F5E' : score >= 40 ? '#E07330' : '#F25A3C'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4DED2" strokeWidth="8" />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-ink tracking-tight">{score}</span>
          <span
            className="text-[9px] text-mute uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            / 100
          </span>
        </div>
      </div>
      <p className="text-sm font-medium" style={{ color }}>
        {score >= 70 ? 'Healthy' : score >= 40 ? 'Fair' : 'Needs attention'}
      </p>
    </div>
  )
}

type RangeOption = 7 | 14 | 30 | 90

export function AnalyticsClient({ userEmail }: { userEmail: string }) {
  const [range, setRange] = useState<RangeOption>(30)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [tat, setTat] = useState<TatData | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/analytics/summary').then(r => r.json()),
      fetch(`/api/analytics/trends?days=${range}`).then(r => r.json()),
      fetch('/api/analytics/tat').then(r => r.json()),
      fetch('/api/analytics/breakdown').then(r => r.json()),
    ])
      .then(([s, t, ta, b]) => {
        setSummary(s)
        setTrends(t)
        setTat(ta)
        setBreakdown(b)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  const donutSegments = breakdown?.byCategory.map(c => ({
    label: c.category,
    value: c.open,
    color: CATEGORY_COLORS[c.category] ?? '#C0BAB0',
  })) ?? []

  const tatBarData = tat?.byCategory.map(c => ({
    label: categoryLabel(c.category),
    value: c.avgDays,
    sublabel: `${c.count} resolved`,
  })) ?? []

  const contactBarData = breakdown?.topContacts.map(c => ({
    label: c.ownerName || c.ownerEmail.split('@')[0],
    value: c.count,
    sublabel: c.ownerEmail,
  })) ?? []

  const dowBarData = breakdown?.byDayOfWeek.map(d => ({
    label: d.label,
    value: d.count,
  })) ?? []

  return (
    <>
      <Header title="Analytics" userEmail={userEmail} />
      <main className="max-w-5xl mx-auto px-6 py-8 animate-fade-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Analytics</h1>
            <p className="text-sm text-mute mt-0.5">Your follow-up health and trends</p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-rule rounded-lg p-1">
            {([7, 14, 30, 90] as RangeOption[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-150 ${
                  range === r
                    ? 'bg-ink text-white font-medium'
                    : 'text-mute hover:text-ink'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-mute text-sm animate-pulse-soft">
            Loading analytics…
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
              <StatCard
                label="Open Items"
                value={summary?.totalOpen ?? 0}
                sublabel={summary?.overdueCount ? `${summary.overdueCount} overdue` : 'None overdue'}
                accent={!!(summary?.overdueCount)}
              />
              <StatCard
                label="Resolved This Week"
                value={summary?.resolvedThisWeek ?? 0}
                trend={
                  summary
                    ? { value: summary.weekOverWeekChange, label: 'vs last week' }
                    : undefined
                }
              />
              <StatCard
                label="Avg Resolution Time"
                value={tat?.overall ? `${tat.overall}d` : '—'}
                sublabel="Across all categories"
              />
              <StatCard
                label="Overdue"
                value={summary?.overdueCount ?? 0}
                sublabel={
                  summary?.topCategory
                    ? `Top: ${categoryLabel(summary.topCategory)}`
                    : undefined
                }
                accent={!!(summary?.overdueCount)}
              />
            </div>

            {/* Health score + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-card border border-rule rounded-lg p-6 flex flex-col items-center justify-center">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Health Score
                </p>
                <HealthRing score={summary?.healthScore ?? 0} />
              </div>
              <div className="lg:col-span-2 bg-card border border-rule rounded-lg p-6">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Open Items by Category
                </p>
                <DonutChart segments={donutSegments} size={130} />
              </div>
            </div>

            {/* Volume & resolved trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-card border border-rule rounded-lg p-6">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  New Items — {range}d
                </p>
                <LineChart data={trends?.volumeByDay ?? []} color="#0B1220" height={150} />
              </div>
              <div className="bg-card border border-rule rounded-lg p-6">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Resolved Items — {range}d
                </p>
                <LineChart data={trends?.resolvedByDay ?? []} color="#1A8F5E" height={150} />
              </div>
            </div>

            {/* TAT + Day of week */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-card border border-rule rounded-lg p-6">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Avg TAT by Category (days)
                </p>
                {tatBarData.length > 0 ? (
                  <BarChart data={tatBarData} color="#F25A3C" />
                ) : (
                  <p className="text-mute text-sm py-4">No resolved items yet</p>
                )}
              </div>
              <div className="bg-card border border-rule rounded-lg p-6">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Activity by Day of Week
                </p>
                <BarChart data={dowBarData} color="#0B1220" />
              </div>
            </div>

            {/* Top contacts */}
            {contactBarData.length > 0 && (
              <div className="bg-card border border-rule rounded-lg p-6">
                <p
                  className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Top Contacts — Open Follow-ups
                </p>
                <BarChart data={contactBarData} color="#F25A3C" />
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
