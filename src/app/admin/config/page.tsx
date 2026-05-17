'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Save, Eye, EyeOff } from 'lucide-react'

interface ConfigState {
  hasStripeSecret: boolean
  stripePublishableKey: string
  hasRazorpayKeyId: boolean
  hasRazorpaySecret: boolean
  stripeSecretMasked: string | null
  razorpayKeyIdMasked: string | null
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
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </header>
  )
}

export default function AdminConfigPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigState | null>(null)
  const [stripeSecret, setStripeSecret] = useState('')
  const [stripePub, setStripePub] = useState('')
  const [rzpKeyId, setRzpKeyId] = useState('')
  const [rzpSecret, setRzpSecret] = useState('')
  const [showStripe, setShowStripe] = useState(false)
  const [showRzp, setShowRzp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => {
        if (d) {
          setConfig(d)
          setStripePub(d.stripePublishableKey ?? '')
        }
      })
  }, [router])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const body: Record<string, string> = {}
      if (stripeSecret) body.stripeSecretKey = stripeSecret
      if (stripePub !== (config?.stripePublishableKey ?? '')) body.stripePublishableKey = stripePub
      if (rzpKeyId) body.razorpayKeyId = rzpKeyId
      if (rzpSecret) body.razorpaySecret = rzpSecret
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSaved(true)
      setStripeSecret('')
      setRzpKeyId('')
      setRzpSecret('')
      // Refresh
      const updated = await fetch('/api/admin/config').then(r => r.json())
      setConfig(updated)
      setStripePub(updated.stripePublishableKey ?? '')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Payment Gateway Config</h1>

        {config === null && <p className="text-sm text-gray-500">Loading…</p>}

        {config && (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Stripe section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">S</div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Stripe</h2>
                  <p className="text-xs text-gray-400">
                    {config.hasStripeSecret ? `Secret key saved (${config.stripeSecretMasked})` : 'No secret key set'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Secret Key {config.hasStripeSecret && <span className="text-gray-400">(leave blank to keep existing)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showStripe ? 'text' : 'password'}
                      value={stripeSecret}
                      onChange={e => setStripeSecret(e.target.value)}
                      placeholder={config.hasStripeSecret ? '••••••••' : 'sk_live_...'}
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <button type="button" onClick={() => setShowStripe(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showStripe ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Publishable Key</label>
                  <input
                    type="text"
                    value={stripePub}
                    onChange={e => setStripePub(e.target.value)}
                    placeholder="pk_live_..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Razorpay section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">R</div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Razorpay</h2>
                  <p className="text-xs text-gray-400">
                    {config.hasRazorpayKeyId
                      ? `Key ID saved (${config.razorpayKeyIdMasked})`
                      : 'No credentials set'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Key ID {config.hasRazorpayKeyId && <span className="text-gray-400">(leave blank to keep existing)</span>}
                  </label>
                  <input
                    type={showRzp ? 'text' : 'password'}
                    value={rzpKeyId}
                    onChange={e => setRzpKeyId(e.target.value)}
                    placeholder={config.hasRazorpayKeyId ? '••••••••' : 'rzp_live_...'}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Secret {config.hasRazorpaySecret && <span className="text-gray-400">(leave blank to keep existing)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showRzp ? 'text' : 'password'}
                      value={rzpSecret}
                      onChange={e => setRzpSecret(e.target.value)}
                      placeholder={config.hasRazorpaySecret ? '••••••••' : 'Enter Razorpay secret…'}
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <button type="button" onClick={() => setShowRzp(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showRzp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save credentials'}
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
