'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Plus, X } from 'lucide-react'
import { format } from 'date-fns'

interface Payment {
  id: string
  amountCents: number
  currency: string
  provider: string
  status: string
  planType: string
  planDays: number
  notes: string | null
  createdAt: string
  user: { id: string; email: string; name: string | null; planType: string }
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
  if (status === 'refunded') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-500'
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [data, setData] = useState<{ payments: Payment[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    userId: '', amountCents: '', currency: 'INR', provider: 'razorpay',
    planType: 'lite', planDays: '30', notes: '',
  })
  const [adding, setAdding] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/admin/payments')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [router])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  async function handleAddPayment() {
    setAdding(true)
    try {
      await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          amountCents: parseInt(addForm.amountCents),
          planDays: parseInt(addForm.planDays),
        }),
      })
      setShowAdd(false)
      setAddForm({ userId: '', amountCents: '', currency: 'INR', provider: 'razorpay', planType: 'lite', planDays: '30', notes: '' })
      load()
    } finally {
      setAdding(false)
    }
  }

  const fmtAmount = (p: Payment) => {
    const major = p.amountCents / 100
    return `${p.currency} ${major.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">{data?.total ?? 0} total records</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            <Plus className="h-4 w-4" /> Record payment
          </button>
        </div>

        {/* Add payment modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-900">Record Manual Payment</h2>
                <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'User ID', key: 'userId', type: 'text', placeholder: 'user cuid...' },
                  { label: 'Amount (smallest unit)', key: 'amountCents', type: 'number', placeholder: '90000 = ₹900' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    <input type={f.type} value={(addForm as any)[f.key]}
                      onChange={e => setAddForm(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                    <select value={addForm.currency} onChange={e => setAddForm(v => ({ ...v, currency: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none">
                      <option>INR</option><option>USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                    <select value={addForm.provider} onChange={e => setAddForm(v => ({ ...v, provider: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none">
                      <option value="razorpay">Razorpay</option>
                      <option value="stripe">Stripe</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                    <select value={addForm.planType} onChange={e => setAddForm(v => ({ ...v, planType: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none">
                      <option value="lite">Lite</option><option value="pro">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
                    <input type="number" value={addForm.planDays}
                      onChange={e => setAddForm(v => ({ ...v, planDays: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input type="text" value={addForm.notes}
                    onChange={e => setAddForm(v => ({ ...v, notes: e.target.value }))}
                    placeholder="Optional transaction note"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddPayment} disabled={adding}
                  className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {adding ? 'Recording…' : 'Record'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {data && data.payments.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">No payments recorded yet</p>
          </div>
        )}

        {data && data.payments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'User', 'Amount', 'Plan', 'Provider', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(p.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${p.user.id}`} className="font-medium text-gray-900 hover:underline">
                        {p.user.name ?? p.user.email}
                      </Link>
                      <p className="text-xs text-gray-400">{p.user.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{fmtAmount(p)}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{p.planType}</span>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{p.provider}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${p.user.id}`}
                        className="text-xs text-gray-400 hover:text-gray-700 hover:underline">View user</Link>
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
