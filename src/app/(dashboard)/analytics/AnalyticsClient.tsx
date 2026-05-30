'use client'
import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/charts/StatCard'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { LogoMark } from '@/components/ui/Logo'
import { ExternalLink, Copy, Check, Info } from 'lucide-react'

// Inline brand SVGs (lucide-react doesn't ship these)
const IconX = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.622 5.905-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
)
const IconLinkedIn = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
)
const IconFacebook = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
)
const IconInstagram = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
)
const IconSnapchat = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C8.396 0 5.48 2.895 5.48 6.49c0 .42.043.83.12 1.226l-.07.038c-.427.22-.91.31-1.395.257-.07-.007-.14-.01-.21-.01-.602 0-1.14.392-1.32.97a1.38 1.38 0 0 0 .93 1.712c.376.107.76.187 1.148.24.07.01.12.07.134.14.17.83.616 1.58 1.27 2.12-.44.26-.9.45-1.38.57-.22.055-.38.245-.39.474a.49.49 0 0 0 .38.5c1.12.245 2.17 1.01 2.87 2.11.1.16.27.25.45.25.1 0 .2-.03.29-.08.6-.35 1.27-.53 1.96-.53.46 0 .91.08 1.34.23.04.015.08.02.12.02.28 0 .52-.18.6-.45.13-.43.54-.73 1-.73s.87.3 1 .73c.08.27.32.45.6.45.04 0 .08-.005.12-.02.43-.15.88-.23 1.34-.23.69 0 1.36.18 1.96.53.09.05.19.08.29.08.18 0 .35-.09.45-.25.7-1.1 1.75-1.865 2.87-2.11a.49.49 0 0 0 .38-.5c-.01-.229-.17-.419-.39-.474-.48-.12-.94-.31-1.38-.57.654-.54 1.1-1.29 1.27-2.12.014-.07.064-.13.134-.14.388-.053.772-.133 1.148-.24a1.38 1.38 0 0 0 .93-1.712 1.374 1.374 0 0 0-1.32-.97c-.07 0-.14.003-.21.01-.485.053-.968-.037-1.395-.257l-.07-.038c.077-.396.12-.806.12-1.226C18.554 2.895 15.638 0 12.017 0z"/></svg>
)

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
function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle normal-case tracking-normal">
      <Info className="h-3 w-3 text-mute cursor-help" />
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 w-56 rounded-md bg-ink text-white text-[11px] font-normal leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
        {text}
      </span>
    </span>
  )
}

function Eyebrow({ children, info }: { children: React.ReactNode; info?: string }) {
  return (
    <p
      className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-4 flex items-center gap-1.5"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
      {info && <InfoTip text={info} />}
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
      <p className="text-mute text-sm">No action items yet — run a scan to populate your analytics.</p>
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

// ── Share card ────────────────────────────────────────────────────────
function StatsShareCard() {
  interface MyStats {
    period: string
    thisMonth: { total: number; handled: number; replyRate: number | null }
  }
  interface ShareResult { daysAdded: number; totalShares: number }

  const [stats, setStats] = useState<MyStats | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareResult, setShareResult] = useState<ShareResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stats/my').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/user/profile').then(r => r.json()).then((d: { id: string }) => setUserId(d.id)).catch(() => {})
  }, [])

  const shareUrl = userId ? `${window.location.origin}/s/${userId}` : ''

  const handleShare = async (platform: string) => {
    setSharing(true)
    try {
      const res = await fetch('/api/stats/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json()
      setShareResult(data)
    } finally {
      setSharing(false)
    }
  }

  const copyLink = async (platform: string) => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    handleShare(platform)
    setCopied(platform)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!stats) return null

  const { period, thisMonth } = stats
  const shareText = `I handled ${thisMonth.handled} emails and replied to ${thisMonth.replyRate ?? '?'}% on time in ${period} using @pendingly 📧`

  return (
    <div className="bg-white border border-[rgba(11,18,32,0.08)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-[rgba(11,18,32,0.4)] uppercase tracking-wider">Share your stats</p>
          <p className="text-sm text-[rgba(11,18,32,0.6)] mt-0.5">{period}</p>
        </div>
        {shareUrl && (
          <a href={shareUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[rgba(11,18,32,0.4)] hover:text-ink transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> Preview card
          </a>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        {thisMonth.replyRate != null && (
          <div>
            <p className="text-3xl font-bold text-[#0b1220]">{thisMonth.replyRate}<span className="text-lg">%</span></p>
            <p className="text-xs text-[rgba(11,18,32,0.45)]">reply rate</p>
          </div>
        )}
        <div>
          <p className="text-3xl font-bold text-[#0b1220]">{thisMonth.handled}</p>
          <p className="text-xs text-[rgba(11,18,32,0.45)]">emails handled</p>
        </div>
      </div>

      {shareResult && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${shareResult.daysAdded > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[rgba(11,18,32,0.04)] text-[rgba(11,18,32,0.5)]'}`}>
          {shareResult.daysAdded > 0
            ? `+${shareResult.daysAdded} days added to your plan! 🎉`
            : 'Already shared today — bonus applies once per day.'}
        </div>
      )}

      {/* Primary share buttons */}
      <div className="flex gap-2 mb-2">
        <button
          disabled={sharing || !shareUrl}
          onClick={() => { handleShare('twitter'); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank') }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#0b1220] text-white text-xs font-medium hover:bg-[#1a2535] transition-colors disabled:opacity-50"
        >
          <IconX /> X
        </button>
        <button
          disabled={sharing || !shareUrl}
          onClick={() => { handleShare('linkedin'); window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank') }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(11,18,32,0.12)] text-[#0b1220] text-xs font-medium hover:bg-[rgba(11,18,32,0.04)] transition-colors disabled:opacity-50"
        >
          <IconLinkedIn /> LinkedIn
        </button>
        <button
          disabled={sharing || !shareUrl}
          onClick={() => { handleShare('facebook'); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank') }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(11,18,32,0.12)] text-[#0b1220] text-xs font-medium hover:bg-[rgba(11,18,32,0.04)] transition-colors disabled:opacity-50"
        >
          <IconFacebook /> Facebook
        </button>
      </div>

      {/* Copy-link buttons for platforms without web share */}
      <div className="flex gap-2">
        <button
          disabled={!shareUrl}
          onClick={() => copyLink('instagram')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(11,18,32,0.12)] text-[#0b1220] text-xs font-medium hover:bg-[rgba(11,18,32,0.04)] transition-colors disabled:opacity-50"
        >
          {copied === 'instagram' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <IconInstagram />}
          {copied === 'instagram' ? 'Copied!' : 'Instagram'}
        </button>
        <button
          disabled={!shareUrl}
          onClick={() => copyLink('snapchat')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(11,18,32,0.12)] text-[#0b1220] text-xs font-medium hover:bg-[rgba(11,18,32,0.04)] transition-colors disabled:opacity-50"
        >
          {copied === 'snapchat' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <IconSnapchat />}
          {copied === 'snapchat' ? 'Copied!' : 'Snapchat'}
        </button>
        <button
          disabled={!shareUrl}
          onClick={() => copyLink('other')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(11,18,32,0.12)] text-[#0b1220] text-xs font-medium hover:bg-[rgba(11,18,32,0.04)] transition-colors disabled:opacity-50"
        >
          {copied === 'other' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === 'other' ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <p className="text-[10px] text-[rgba(11,18,32,0.35)] mt-2">Each unique share adds 7 free days to your plan (once per day)</p>
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

  const fetchAll = useCallback(async () => {
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
    } catch {
      // silently ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

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
        {/* Share your stats card */}
        <div className="max-w-sm mb-8">
          <StatsShareCard />
        </div>

        {<>
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
                      className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-3 flex items-center gap-1.5"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      Inbox Health
                      <InfoTip text="Starts at 100. Each open item −2 (max −40), each overdue item −5 (max −30), each item resolved this week +2 (max +20). 100 means nothing is pending." />
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
                    info="Turn-around time: the average number of days between an item being detected and you marking it done. Averaged across all completed items. 0d means same-day resolution."
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
                    info="Items marked done in the last 7 days. The trend compares this with the 7 days before that."
                  />

                  <StatCard
                    label="Overdue"
                    value={summary?.overdueCount ?? '—'}
                    sublabel="items past due date"
                    accent={!!(summary && summary.overdueCount > 0)}
                    info="Open items whose due date is earlier than today. These need attention first."
                  />
                </>
              )}
            </div>

            {/* Row 2: Volume Trend + Category Mix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-card border border-rule rounded-lg p-6">
                <Eyebrow info="Number of new action items detected each day over the last 30 days. Spikes show your busiest days.">Volume Trend</Eyebrow>
                {loading ? (
                  <div className="h-40 bg-rule rounded animate-pulse" />
                ) : (
                  <LineChart data={trends?.volumeByDay ?? []} height={160} />
                )}
                <p className="text-xs text-mute mt-2">New action items per day — last 30 days</p>
              </div>

              <div className="bg-card border border-rule rounded-lg p-6">
                <Eyebrow info="How your currently open items split across categories (Reply Needed, Waiting on Them, etc).">Category Mix</Eyebrow>
                {loading ? (
                  <div className="h-40 bg-rule rounded animate-pulse" />
                ) : (
                  <DonutChart segments={donutSegments} size={140} />
                )}
              </div>
            </div>

            {/* Row 3: TAT by Category */}
            <div className="bg-card border border-rule rounded-lg p-6 mb-8">
              <Eyebrow info="Average days from detection to completion, split by category. Shows which kinds of items you resolve fastest or slowest.">Turn-Around Time by Category</Eyebrow>
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
              <Eyebrow info="Of every action item ever created, how many ended up done, snoozed, ignored, or are still open.">Resolution Funnel</Eyebrow>
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
                <Eyebrow info="Which weekday tends to generate the most new action items, totalled across all weeks.">Day-of-Week Pattern</Eyebrow>
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
                <Eyebrow info="People with the most open items waiting on you. Start here to clear the most relationships fastest.">Top Pending Contacts</Eyebrow>
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
              <Eyebrow info="Still-open items grouped by the week they were created, over the last 8 weeks. A rising bar means older items are piling up unresolved.">Overdue Trend</Eyebrow>
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
          </>}
      </main>
    </>
  )
}
