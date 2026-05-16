'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/charts/StatCard'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { LogoMark } from '@/components/ui/Logo'

// ── Types ────────────────────────────────────────────────────────────
interface Summary {
  healthScore: number
  totalOpen: number
  resolvedThisWeek: number
  avgTatDays: number
  overdueCount: number
  topCategory: string | null
  weekOverWeekChange: number
}

interface Trends {
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

// ── Category palette ──────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  reply_needed: '#F25A3C',
  waiting_on_them: '#0B1220',
  followup_due: '#5B6473',
  commitment_detected: '#8C94A4',
  overdue_commitment: '#1B2231',
  no_action_needed: '#E4DED2',
}

// ── Helpers ───────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </p>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-rule rounded-lg p-6 animate-pulse">
      <div className="h-3 bg-rule rounded w-24 mb-4" />
      <div className="h-8 bg-rule rounded w-16 mb-2" />
      <div className="h-3 bg-rule rounded w-32" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <LogoMark className="h-12 w-12 opacity-30" />
      <p className="text-mute text-sm">Connect an inbox to see your analytics.</p>
    </div>
  )
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-done'
  if (score >= 50) return 'text-ink'
  return 'text-action'
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase()
  return email.charAt(0).toUpperCase()
}

// ── Day-of-week vertical bar chart ────────────────────────────────────
function DayOfWeekChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const maxIdx = data.reduce((best, d, i) => d.value > data[best].value ? i : best, 0)

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        const isMax = i === maxIdx
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] text-mute tabular-nums">{d.value || ''}</span>
            <div className="w-full flex items-end" style={{ height: 80 }}>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  backgroundColor: isMax ? '#F25A3C' : '#E4DED2',
                }}
              />
            </div>
            <span
              className="text-[10px] text-mute"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export function AnalyticsClient({ userEmail }: { userEmail: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trends, setTrends] = useState<Trends | null>(null)
  const [tat, setTat] = useState<TatData | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, t, ta, b] = await Promise.all([
        fetch('/api/analytics/summary').then(r => r.json()),
        fetch('/api/analytics/trends?days=30').then(r => r.json()),
        fetch('/api/analytics/tat').then(r => r.json()),
        fetch('/api/analytics/breakdown').then(r => r.json()),
      ])
      setSummary(s as Summary)
      setTrends(t as Trends)
      setTat(ta as TatData)
      setBreakdown(b as BreakdownData)

      const bd = b as BreakdownData
      const totalItems = bd?.byStatus?.reduce(
        (acc: number, item: { status: string; count: number }) => acc + item.count,
        0
      ) ?? 0
      setHasData(totalItems > 0)
    } catch {
      // silently ignore fetch errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchAll() }, [])

  // ── Derived data for charts ──────────────────────────────────────
  const donutSegments = breakdown
    ? breakdown.byCategory
        .map(cat => ({
          label: cat.category,
          value: cat.open,
          color: CATEGORY_COLORS[cat.category] ?? '#8C94A4',
        }))
        .filter(s => s.value > 0)
    : []

  const tatBarData = tat
    ? tat.byCategory.map(c => ({
        label: c.category,
        value: c.avgDays,
        sublabel: `${c.count} items`,
      }))
    : []

  const dowBarData = breakdown
    ? breakdown.byDayOfWeek
        .slice()
        .sort((a, b) => a.day - b.day)
        .map(d => ({ label: d.label, value: d.count }))
    : []

  const overdueWeekData = trends
    ? trends.overdueByWeek.map(w => {
        const weekNum = w.week.split('-W')[1]
        return { label: `W${weekNum}`, value: w.count }
      })
    : []

  const funnelData = breakdown
    ? (() => {
        const statusCounts: Record<string, number> = {}
        for (const s of breakdown.byStatus) statusCounts[s.status] = s.count
        const total = Object.values(statusCounts).reduce((a, b) => a + b, 0)
        return [
          { label: 'Created', value: total },
          { label: 'Done', value: statusCounts['done'] ?? 0 },
          { label: 'Snoozed', value: statusCounts['snoozed'] ?? 0 },
          { label: 'Ignored', value: statusCounts['ignored'] ?? 0 },
          { label: 'Still Open', value: statusCounts['open'] ?? 0 },
        ]
      })()
    : []

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <Header title="Analytics" userEmail={userEmail} onSync={fetchAll} />

      <main className="p-6 bg-paper min-h-screen">
        {!loading && !hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Row 1: 4 StatCards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  {/* Health Score */}
                  <div className="bg-card border border-rule rounded-lg p-6">
                    <p
                      className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-3"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      Inbox Health
                    </p>
                    <p
                      className={`text-4xl font-semibold tracking-tight ${getHealthColor(summary?.healthScore ?? 100)}`}
                    >
                      {summary?.healthScore ?? '—'}
                    </p>
                    <div className="mt-3 h-1.5 bg-rule rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${summary?.healthScore ?? 0}%`,
                          backgroundColor:
                            (summary?.healthScore ?? 0) >= 80
                              ? '#1A8F5E'
                              : (summary?.healthScore ?? 0) >= 50
                              ? '#0B1220'
                              : '#F25A3C',
                        }}
                      />
                    </div>
                    <p className="text-xs text-mute mt-1">out of 100</p>
                  </div>

                  <StatCard
                    label="Avg TAT"
                    value={summary ? `${summary.avgTatDays}d` : '—'}
                    sublabel="avg days to resolve"
                  />

                  <StatCard
                    label="Resolved This Week"
                    value={summary?.resolvedThisWeek ?? '—'}
                    sublabel="items closed"
                    trend={
                      summary
                        ? { value: summary.weekOverWeekChange, label: 'vs last week' }
                        : undefined
                    }
                  />

                  <StatCard
                    label="Overdue"
                    value={summary?.overdueCount ?? '—'}
                    sublabel="items past due date"
                    accent={!!(summary && summary.overdueCount > 0)}
                  />
                </>
              )}
            </div>

            {/* Row 2: Volume Trend + Category Mix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-card border border-rule rounded-lg p-6">
                <Eyebrow>Volume Trend</Eyebrow>
                {loading ? (
                  <div className="h-40 bg-rule rounded animate-pulse" />
                ) : (
                  <LineChart data={trends?.volumeByDay ?? []} height={160} />
                )}
                <p className="text-xs text-mute mt-2">New action items per day — last 30 days</p>
              </div>

              <div className="bg-card border border-rule rounded-lg p-6">
                <Eyebrow>Category Mix</Eyebrow>
                {loading ? (
                  <div className="h-40 bg-rule rounded animate-pulse" />
                ) : (
                  <DonutChart segments={donutSegments} size={140} />
                )}
              </div>
            </div>

            {/* Row 3: TAT by Category */}
            <div className="bg-card border border-rule rounded-lg p-6 mb-8">
              <Eyebrow>Turn-Around Time by Category</Eyebrow>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-6 bg-rule rounded animate-pulse" />
                  ))}
                </div>
              ) : tatBarData.length === 0 ? (
                <p className="text-mute text-sm py-4">No resolved items yet.</p>
              ) : (
                <BarChart data={tatBarData} color="#F25A3C" />
              )}
              {tat && tat.overall > 0 && (
                <p className="text-xs text-mute mt-4">
                  Overall average:{' '}
                  <span className="font-semibold text-ink">{tat.overall}d</span>
                </p>
              )}
            </div>

            {/* Row 4: Resolution Funnel */}
            <div className="bg-card border border-rule rounded-lg p-6 mb-8">
              <Eyebrow>Resolution Funnel</Eyebrow>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-6 bg-rule rounded animate-pulse" />
                  ))}
                </div>
              ) : funnelData.length === 0 ? (
                <p className="text-mute text-sm py-4">No data yet.</p>
              ) : (
                <BarChart
                  data={funnelData.map(f => ({ label: f.label, value: f.value }))}
                  maxValue={funnelData[0]?.value ?? 1}
                  color="#0B1220"
                />
              )}
            </div>

            {/* Row 5: Day-of-week + Top Contacts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-card border border-rule rounded-lg p-6">
                <Eyebrow>Day-of-Week Pattern</Eyebrow>
                {loading ? (
                  <div className="h-40 bg-rule rounded animate-pulse" />
                ) : dowBarData.length === 0 ? (
                  <p className="text-mute text-sm py-4">No data yet.</p>
                ) : (
                  <DayOfWeekChart data={dowBarData} />
                )}
                <p className="text-xs text-mute mt-3">
                  Which day generates the most new items
                </p>
              </div>

              <div className="bg-card border border-rule rounded-lg p-6">
                <Eyebrow>Top Pending Contacts</Eyebrow>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-10 bg-rule rounded animate-pulse" />
                    ))}
                  </div>
                ) : !breakdown || breakdown.topContacts.length === 0 ? (
                  <p className="text-mute text-sm py-4">No pending contacts.</p>
                ) : (
                  <div className="space-y-3">
                    {breakdown.topContacts.map((contact, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-white">
                            {getInitials(contact.ownerName, contact.ownerEmail)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {contact.ownerName || contact.ownerEmail}
                          </p>
                          {contact.ownerName && (
                            <p className="text-xs text-mute truncate">{contact.ownerEmail}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 bg-action text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {contact.count}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 6: Overdue Trend */}
            <div className="bg-card border border-rule rounded-lg p-6">
              <Eyebrow>Overdue Trend</Eyebrow>
              {loading ? (
                <div className="h-32 bg-rule rounded animate-pulse" />
              ) : overdueWeekData.length === 0 ? (
                <p className="text-mute text-sm py-4">No data yet.</p>
              ) : (
                <BarChart
                  data={overdueWeekData.map(d => ({ label: d.label, value: d.value }))}
                  color="#F25A3C"
                />
              )}
              <p className="text-xs text-mute mt-3">
                Open items created per week — last 8 weeks
              </p>
            </div>
          </>
        )}
      </main>
    </>
  )
}
