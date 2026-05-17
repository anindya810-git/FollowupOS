'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ArrowLeft, Edit2, Check, X } from 'lucide-react'
import { format } from 'date-fns'

interface UserDetail {
  user: {
    id: string; email: string; name: string | null; planType: string
    planExpiresAt: string | null; trialStartedAt: string; createdAt: string
    referralCode: string; emailAccounts: Array<{ id: string; emailAddress: string; provider: string; createdAt: string }>
  }
  payments: Array<{
    id: string; amountCents: number; currency: string; provider: string
    status: string; planType: string; planDays: number; createdAt: string; notes: string | null
  }>
  aiUsageThisMonth: Record<string, { metered: number; byok: number }>
  allTimeAiCalls: number
  referrals: Array<{ id: string; daysAwarded: number; createdAt: string; referred: { email: string; name: string | null; createdAt: string } }>
  shareEvents: Array<{ id: string; platform: string | null; createdAt: string }>
  totalRevenueUSD: number
}

function AdminNav({ onLogout }: { onLogout: () => void }) {
  return (
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
        <button onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </header>
  )
}

function statusColor(status: string) {
  if (status === 'captured') return 'bg-green-100 text-green-700'
  if (status === 'pending') return 'bg-amber-100 text-amber-700'
  if (status === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-500'
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editPlan, setEditPlan] = useState(false)
  const [newPlan, setNewPlan] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    fetch(`/api/admin/users/${id}`)
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => {
        if (d) {
          setData(d)
          setNewPlan(d.user.planType)
          setNewExpiry(d.user.planExpiresAt ? d.user.planExpiresAt.slice(0, 10) : '')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [id, router])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  async function savePlan() {
    setSaving(true)
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: newPlan,
          planExpiresAt: newExpiry || null,
        }),
      })
      setEditPlan(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      <main className="max-w-4xl mx-auto px-6 py-8"><p className="text-sm text-gray-500">Loading…</p></main>
    </div>
  )

  if (!data) return null

  const { user, payments, aiUsageThisMonth, allTimeAiCalls, referrals, shareEvents, totalRevenueUSD } = data

  const totalAiThisMonth = Object.values(aiUsageThisMonth).reduce((s, v) => s + v.metered + v.byok, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name ?? user.email}</h1>
            <p className="text-sm text-gray-500">{user.email} · joined {format(new Date(user.createdAt), 'dd MMM yyyy')}</p>
          </div>
        </div>

        {/* Plan + quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Plan', value: user.planType.toUpperCase(), sub: user.planExpiresAt ? `until ${format(new Date(user.planExpiresAt), 'dd MMM yy')}` : 'no expiry' },
            { label: 'Revenue', value: `$${totalRevenueUSD}`, sub: `${payments.filter(p => p.status === 'captured').length} payment(s)` },
            { label: 'AI calls (mo)', value: String(totalAiThisMonth), sub: `${allTimeAiCalls} all time` },
            { label: 'Referrals', value: String(referrals.length), sub: `${shareEvents.length} shares` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 capitalize">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Plan editor */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Plan Management</h2>
            {!editPlan ? (
              <button onClick={() => setEditPlan(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-2.5 py-1 rounded-lg">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditPlan(false)} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
                <button onClick={savePlan} disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1 rounded-lg disabled:opacity-50">
                  <Check className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
          {editPlan ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Type</label>
                <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="free">Free</option>
                  <option value="lite">Lite</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expires At (blank = never)</label>
                <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div><span className="text-gray-500">Current plan: </span><strong className="capitalize">{user.planType}</strong></div>
              <div><span className="text-gray-500">Expires: </span><strong>{user.planExpiresAt ? format(new Date(user.planExpiresAt), 'dd MMM yyyy') : 'Never'}</strong></div>
              <div><span className="text-gray-500">Referral code: </span><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{user.referralCode}</code></div>
              <div><span className="text-gray-500">Email accounts: </span><strong>{user.emailAccounts.length}</strong></div>
            </div>
          )}
        </div>

        {/* AI usage breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">AI Usage (this month)</h2>
          {Object.keys(aiUsageThisMonth).length === 0 ? (
            <p className="text-sm text-gray-400">No AI calls this month</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(aiUsageThisMonth).map(([type, counts]) => (
                <div key={type} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 capitalize">{type}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{counts.metered + counts.byok}</p>
                  <p className="text-xs text-gray-400">{counts.metered} metered · {counts.byok} BYOK</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Payments ({payments.length})</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">No payments</p>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900 font-medium">
                      {p.currency} {(p.amountCents / 100).toFixed(2)} via {p.provider}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(p.createdAt), 'dd MMM yyyy')} · {p.planType} · {p.planDays}d{p.notes ? ` · ${p.notes}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referrals */}
        {referrals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Referrals Given ({referrals.length})</h2>
            <div className="space-y-2">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-900">{r.referred.name ?? r.referred.email}</p>
                    <p className="text-xs text-gray-400">{format(new Date(r.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">+{r.daysAwarded}d</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
