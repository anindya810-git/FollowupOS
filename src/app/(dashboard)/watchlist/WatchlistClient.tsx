'use client'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Eye, Mail, Globe, MessageSquare, Bell } from 'lucide-react'

interface WatchItem {
  id: string
  senderEmail?: string | null
  domain?: string | null
  threadId?: string | null
  label?: string | null
}

function watchKind(w: WatchItem): 'person' | 'domain' | 'thread' {
  if (w.senderEmail) return 'person'
  if (w.domain) return 'domain'
  return 'thread'
}

function watchLabel(w: WatchItem): string {
  if (w.senderEmail) return w.senderEmail
  if (w.domain) return `@${w.domain}`
  return w.label || 'Watched thread'
}

const KIND_META = {
  person:  { icon: Mail,          chip: 'bg-blue-50 text-blue-700 border-blue-100',   label: 'Person'  },
  domain:  { icon: Globe,         chip: 'bg-purple-50 text-purple-700 border-purple-100', label: 'Domain' },
  thread:  { icon: MessageSquare, chip: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Thread'  },
}

export function WatchlistClient() {
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setItems(data.watchList ?? [])
    } catch {
      // leave stale data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const add = async () => {
    const v = newValue.trim()
    if (!v) return
    setAdding(true)
    setError(null)
    try {
      const isDomain = !v.includes('@')
      const body = isDomain ? { domain: v.replace(/^@/, '') } : { sender_email: v }
      const res = await fetch('/api/settings/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to add')
      }
      setNewValue('')
      fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/settings/watchlist/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(w => w.id !== id))
  }

  const persons = items.filter(w => watchKind(w) === 'person')
  const domains = items.filter(w => watchKind(w) === 'domain')
  const threads = items.filter(w => watchKind(w) === 'thread')
  const groups: Array<{ key: 'person' | 'domain' | 'thread'; list: WatchItem[] }> = (
    [
      { key: 'person' as const, list: persons },
      { key: 'domain' as const, list: domains },
      { key: 'thread' as const, list: threads },
    ] as const
  ).filter(g => g.list.length > 0)

  return (
    <>
      <Header title="WatchList" />
      <main className="p-4 md:p-6 max-w-2xl space-y-6">

        {/* Hero description */}
        <div className="flex items-start gap-3 rounded-xl border border-[rgb(11_18_32/8%)] bg-paper-2 px-5 py-4">
          <Eye className="h-5 w-5 text-action mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">Get a push on every email from anyone you watch</p>
            <p className="text-sm text-[rgb(11_18_32/55%)] mt-0.5 leading-relaxed">
              Add a person, a whole domain, or a specific thread. Every new email matching a watch entry sends a real-time push notification on top of Pendingly&apos;s regular urgent-item alerts.
              You can also watch a thread directly from its detail view in All Items.
            </p>
          </div>
        </div>

        {/* Add new watch */}
        <div className="rounded-xl border border-[rgb(11_18_32/8%)] bg-white px-5 py-4 space-y-3">
          <p className="text-sm font-semibold text-ink">Add to WatchList</p>
          <p className="text-xs text-[rgb(11_18_32/50%)]">
            Enter an email address to watch a person, or a bare domain (e.g. <span className="font-mono">acme.com</span>) to watch every email from that company.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="email@example.com or acme.com"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !adding && add()}
              className="flex-1"
            />
            <Button onClick={add} disabled={adding || !newValue.trim()} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {adding ? 'Adding…' : 'Watch'}
            </Button>
          </div>
          {error && <p className="text-xs text-action">{error}</p>}
        </div>

        {/* Current watches */}
        {loading ? (
          <div className="rounded-xl border border-[rgb(11_18_32/8%)] bg-white px-5 py-8 text-center text-sm text-[rgb(11_18_32/40%)]">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgb(11_18_32/15%)] px-5 py-10 text-center">
            <Bell className="h-8 w-8 text-[rgb(11_18_32/20%)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[rgb(11_18_32/50%)]">Nothing on your WatchList yet</p>
            <p className="text-xs text-[rgb(11_18_32/35%)] mt-1">Add a person or domain above to start getting instant alerts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(({ key, list }) => {
              const meta = KIND_META[key]
              const Icon = meta.icon
              return (
                <div key={key} className="rounded-xl border border-[rgb(11_18_32/8%)] bg-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgb(11_18_32/6%)] bg-paper-2">
                    <Icon className="h-3.5 w-3.5 text-[rgb(11_18_32/40%)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)]">
                      {meta.label}{list.length > 1 ? 's' : ''} ({list.length})
                    </span>
                  </div>
                  <div className="divide-y divide-[rgb(11_18_32/5%)]">
                    {list.map(w => (
                      <div key={w.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}>
                            {meta.label}
                          </span>
                          <span className="text-sm text-ink truncate">{watchLabel(w)}</span>
                        </div>
                        <button
                          onClick={() => remove(w.id)}
                          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md text-[rgb(11_18_32/30%)] hover:text-action hover:bg-[rgb(242_90_60/6%)] transition-colors"
                          title="Remove from WatchList"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-[rgb(11_18_32/35%)] text-center pb-4">
          Thread watches can be added from the detail view of any item in All Items.
        </p>
      </main>
    </>
  )
}
