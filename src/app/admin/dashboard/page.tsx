'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, DollarSign, TrendingUp, Activity, AlertTriangle,
  Settings, CreditCard, LogOut, ArrowRight, Flag,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  byTier: Record<string, number>
  revenueThisMonthUSD: number
  estimatedMRR: number
  totalAiCostUSD: number
  totalAiCalls: number
  grossMarginUSD: number
  grossMarginPct: number | null
  flaggedUsers: number
  perUserMargin: Array<{
    userId: string
    email?: string
    name?: string
    planType?: string
    cost: number
    revenue: number
    margin: number
    marginPct: number | null
    flag: string | null
  }>
  monthStart: string
}

function StatCard({ title, value, sub, icon: Icon, warn }: {
  title: string; value: string; sub?: string; icon: React.ElementType; warn?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${warn ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${warn ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${warn ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <Icon className={`h-5 w-5 ${warn ? 'text-amber-500' : 'text-gray-600'}`} />
        </div>
      </div>
    </div>
  )
}

function flagColor(flag: string | null) {
  if (flag === 'negative') return 'bg-red-100 text-red-700'
  if (flag === 'low') return 'bg-amber-100 text-amber-700'
  if (flag === 'no_revenue') return 'bg-gray-100 text-gray-500'
  return 'bg-green-100 text-green-700'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 401) { router.replace('/admin/login'); return null }
        return r.json()
      })
      .then(d => { if (d) setStats(d) })
      .finally(() => setLoading(false))
  }, [router])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">Pendingly Admin</span>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: '/admin/dashboard', label: 'Dashboard' },
                { href: '/admin/payments', label: 'Payments' },
                { href: '/admin/users', label: 'Users' },
                { href: '/admin/config', label: 'Config' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && <p className="text-sm text-gray-500">Loading stats…</p>}

        {stats && (
          <>
            <div className="mb-8">
              <h1 className="text-xl font-bold text-gray-900">Overview</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Month starting {new Date(stats.monthStart).toLocaleDateString()}
              </p>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Users" value={String(stats.totalUsers)} icon={Users}
                sub={`Free: ${stats.byTier.free ?? 0} · Lite: ${stats.byTier.lite ?? 0} · Pro: ${stats.byTier.pro ?? 0}`} />
              <StatCard title="Est. MRR" value={`$${stats.estimatedMRR}`} icon={DollarSign}
                sub="from plan distribution" />
              <StatCard title="Revenue (month)" value={`$${stats.revenueThisMonthUSD}`} icon={TrendingUp}
                sub="captured payments" />
              <StatCard title="AI Cost (month)" value={`$${stats.totalAiCostUSD}`} icon={Activity}
                sub={`${stats.totalAiCalls.toLocaleString()} metered calls`} />
            </div>

            {/* Gross margin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className={`bg-white rounded-xl border p-5 ${
                stats.grossMarginPct !== null && stats.grossMarginPct < 0 ? 'border-red-200' :
                stats.grossMarginPct !== null && stats.grossMarginPct < 50 ? 'border-amber-200' : 'border-gray-200'
              }`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Gross Margin</p>
                <p className="text-3xl font-bold text-gray-900">{stats.grossMarginPct !== null ? `${stats.grossMarginPct}%` : 'N/A'}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Revenue ${stats.revenueThisMonthUSD} − AI cost ${stats.totalAiCostUSD} = ${stats.grossMarginUSD}
                </p>
                {stats.grossMarginPct !== null && stats.grossMarginPct < 50 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg w-fit">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Margin below 50%
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Flagged Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.flaggedUsers}</p>
                <p className="text-sm text-gray-500 mt-1">Users with negative or &lt;50% margin this month</p>
                {stats.flaggedUsers > 0 && (
                  <Link href="/admin/users"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-700 underline underline-offset-2 hover:opacity-70">
                    Review users <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Active users by tier */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Active Users by Tier</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Free Trial', key: 'free', color: 'bg-gray-100 text-gray-700' },
                  { label: 'Lite ($9/mo)', key: 'lite', color: 'bg-blue-100 text-blue-700' },
                  { label: 'Pro ($15/mo)', key: 'pro', color: 'bg-violet-100 text-violet-700' },
                ].map(t => (
                  <div key={t.key} className={`rounded-lg p-4 ${t.color}`}>
                    <p className="text-xs font-medium opacity-70">{t.label}</p>
                    <p className="text-3xl font-bold mt-1">{stats.byTier[t.key] ?? 0}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-user margin table */}
            {stats.perUserMargin.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Per-user Gross Margin (this month)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">User</th>
                        <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Plan</th>
                        <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">Revenue</th>
                        <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">AI Cost</th>
                        <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">Margin</th>
                        <th className="text-right py-2 text-xs font-medium text-gray-500">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.perUserMargin.map(u => (
                        <tr key={u.userId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pr-4">
                            <Link href={`/admin/users/${u.userId}`} className="text-gray-900 hover:underline font-medium">
                              {u.name ?? u.email ?? u.userId.slice(0, 8)}
                            </Link>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                              {u.planType ?? '—'}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right text-gray-700">${u.revenue}</td>
                          <td className="py-2 pr-4 text-right text-gray-700">${u.cost}</td>
                          <td className="py-2 pr-4 text-right font-medium text-gray-900">${u.margin}</td>
                          <td className="py-2 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${flagColor(u.flag)}`}>
                              {u.flag === 'negative' || u.flag === 'low' ? <Flag className="h-3 w-3" /> : null}
                              {u.marginPct !== null ? `${u.marginPct}%` : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
