'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Search } from 'lucide-react'
import { format } from 'date-fns'

interface UserRow {
  id: string
  email: string
  name: string | null
  image: string | null
  planType: string
  planExpiresAt: string | null
  createdAt: string
  aiCallsThisMonth: number
  _count: { actionItems: number; emailAccounts: number; payments: number }
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

function planBadge(plan: string) {
  if (plan === 'pro') return 'bg-violet-100 text-violet-700'
  if (plan === 'lite') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<{ users: UserRow[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = useCallback((query: string) => {
    setLoading(true)
    const qs = query ? `?q=${encodeURIComponent(query)}` : ''
    fetch(`/api/admin/users${qs}`)
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => { load('') }, [load])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">{data?.total ?? 0} total</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(q)}
              placeholder="Search by email or name…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 w-64"
            />
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {data && data.users.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">No users found</p>
          </div>
        )}

        {data && data.users.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['User', 'Plan', 'AI calls (mo)', 'Action items', 'Payments', 'Joined', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-gray-900 hover:underline">
                        {u.name ?? u.email}
                      </Link>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${planBadge(u.planType)}`}>
                        {u.planType}
                      </span>
                      {u.planExpiresAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          until {format(new Date(u.planExpiresAt), 'dd MMM yy')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.aiCallsThisMonth}</td>
                    <td className="px-4 py-3 text-gray-700">{u._count.actionItems}</td>
                    <td className="px-4 py-3 text-gray-700">{u._count.payments}</td>
                    <td className="px-4 py-3 text-gray-500">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`}
                        className="text-xs text-gray-400 hover:text-gray-700 hover:underline whitespace-nowrap">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
