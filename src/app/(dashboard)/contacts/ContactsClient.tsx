'use client'
import { useEffect, useState, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Loader2, Star, Snowflake, UserX, Users, Clock,
  Search, Trash2, Eye, Sparkles, X, ChevronRight,
  Phone, Briefcase, MapPin, Link2, FileText, Mail,
} from 'lucide-react'

interface ContactInsight {
  id: string | null
  email: string
  name: string | null
  designation: string | null
  company: string | null
  phone: string | null
  city: string | null
  notes: string | null
  linkedinUrl: string | null
  aiEnriched: boolean
  inboundCount: number
  exchangeCount: number
  unrepliedCount: number
  lastInboundAt: string | null
  typicalReplyHours: number | null
  currentGapHours: number | null
  cooling: boolean
  ghosting: boolean
  vip: boolean
  vipScore: number
}

function fmtDur(hours: number | null): string {
  if (hours === null || hours < 0) return '—'
  if (hours < 48) return `${Math.max(1, Math.round(hours))}h`
  return `${Math.round(hours / 24)}d`
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function initials(name: string | null, email: string): string {
  const base = (name || email).trim()
  const parts = base.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

type FilterTab = 'all' | 'vip' | 'cooling' | 'ghosting'

interface EditState {
  name: string
  designation: string
  company: string
  phone: string
  city: string
  notes: string
  linkedinUrl: string
}

function toEdit(c: ContactInsight): EditState {
  return {
    name: c.name ?? '',
    designation: c.designation ?? '',
    company: c.company ?? '',
    phone: c.phone ?? '',
    city: c.city ?? '',
    notes: c.notes ?? '',
    linkedinUrl: c.linkedinUrl ?? '',
  }
}

export function ContactsClient() {
  const [insights, setInsights] = useState<ContactInsight[] | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [drawer, setDrawer] = useState<ContactInsight | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)
  const [watchingEmail, setWatchingEmail] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const fetchInsights = () => {
    fetch('/api/contacts/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => setInsights(Array.isArray(d?.insights) ? d.insights : []))
      .catch(() => setInsights([]))
  }

  useEffect(() => { fetchInsights() }, [])

  // Sync drawer with fresh data after re-fetch
  useEffect(() => {
    if (drawer && insights) {
      const fresh = insights.find(i => i.email === drawer.email)
      if (fresh) { setDrawer(fresh); setEdit(toEdit(fresh)) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights])

  const openDrawer = (c: ContactInsight) => {
    setDrawer(c)
    setEdit(toEdit(c))
  }

  const closeDrawer = () => {
    setDrawer(null)
    setEdit(null)
  }

  const saveContact = async () => {
    if (!drawer?.id || !edit) return
    setSaving(true)
    try {
      await fetch(`/api/contacts/${drawer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      })
      showToast('Saved')
      fetchInsights()
    } catch {
      showToast('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const enrichContact = async () => {
    if (!drawer?.id) return
    setEnriching(true)
    try {
      const res = await fetch(`/api/contacts/${drawer.id}/enrich`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Enrichment failed'); return }
      showToast('AI enrichment complete')
      fetchInsights()
    } catch {
      showToast('Enrichment failed')
    } finally {
      setEnriching(false)
    }
  }

  const deleteContact = async (c: ContactInsight) => {
    if (!c.id) return
    setDeletingEmail(c.email)
    try {
      await fetch(`/api/contacts/${c.id}`, { method: 'DELETE' })
      if (drawer?.email === c.email) closeDrawer()
      setInsights(prev => prev?.filter(i => i.email !== c.email) ?? null)
      showToast('Contact deleted')
    } catch {
      showToast('Delete failed')
    } finally {
      setDeletingEmail(null)
    }
  }

  const addToWatchlist = async (c: ContactInsight) => {
    setWatchingEmail(c.email)
    try {
      const res = await fetch('/api/settings/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: c.email }),
      })
      const d = await res.json()
      showToast(d.duplicate ? 'Already on WatchList' : 'Added to WatchList')
    } catch {
      showToast('Failed to add')
    } finally {
      setWatchingEmail(null)
    }
  }

  const counts = {
    all: insights?.length ?? 0,
    vip: insights?.filter(i => i.vip).length ?? 0,
    cooling: insights?.filter(i => i.cooling).length ?? 0,
    ghosting: insights?.filter(i => i.ghosting).length ?? 0,
  }

  const q = search.toLowerCase()
  const filtered = (insights ?? []).filter(c => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'vip' ? c.vip :
      filter === 'cooling' ? c.cooling :
      c.ghosting
    if (!matchesFilter) return false
    if (!q) return true
    return (
      c.email.toLowerCase().includes(q) ||
      (c.name?.toLowerCase().includes(q) ?? false) ||
      (c.company?.toLowerCase().includes(q) ?? false) ||
      (c.designation?.toLowerCase().includes(q) ?? false) ||
      (c.city?.toLowerCase().includes(q) ?? false)
    )
  })

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: 'all',      label: `All (${counts.all})` },
    { id: 'vip',      label: `VIP (${counts.vip})` },
    { id: 'cooling',  label: `Cooling (${counts.cooling})` },
    { id: 'ghosting', label: `Ghosting (${counts.ghosting})` },
  ]

  return (
    <>
      <Header title="Contacts" />
      <main className="p-6 max-w-3xl">
        <p className="text-sm text-[rgb(11_18_32/55%)] mb-5 max-w-2xl">
          Relationship intelligence learned from your email history — people you&apos;ve had two-way conversations with,
          how you engage, and who&apos;s slipping through the cracks.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(11_18_32/35%)]" />
          <Input
            placeholder="Search by name, email, company, title, or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgb(11_18_32/35%)] hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === t.id
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-[rgb(11_18_32/60%)] border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {insights === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[rgb(11_18_32/35%)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgb(11_18_32/15%)] px-5 py-12 text-center">
            <Users className="h-8 w-8 text-[rgb(11_18_32/20%)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[rgb(11_18_32/50%)]">
              {search ? 'No contacts match your search' : 'No contacts here yet'}
            </p>
            <p className="text-xs text-[rgb(11_18_32/35%)] mt-1 max-w-sm mx-auto">
              {search
                ? 'Try a different name, email, company, or city.'
                : 'Contacts appear here as you exchange emails. Only people you\'ve replied to are shown.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const health = c.ghosting
                ? `${c.unrepliedCount} of ${c.inboundCount} messages went unanswered.`
                : c.cooling
                ? `Usually reply in ${fmtDur(c.typicalReplyHours)}; waiting ${fmtDur(c.currentGapHours)}.`
                : c.typicalReplyHours !== null
                ? `Avg reply time ${fmtDur(c.typicalReplyHours)}.`
                : 'Not enough history yet.'

              return (
                <div
                  key={c.email}
                  className="rounded-xl border border-[rgb(11_18_32/8%)] bg-white overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    {/* Avatar */}
                    <button
                      onClick={() => openDrawer(c)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(11_18_32/8%)] text-[11px] font-bold text-ink hover:bg-[rgb(11_18_32/14%)] transition-colors"
                    >
                      {initials(c.name, c.email)}
                    </button>

                    {/* Info */}
                    <button
                      onClick={() => openDrawer(c)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{c.name || c.email}</span>
                        {c.vip && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> VIP
                          </span>
                        )}
                        {c.cooling && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded">
                            <Snowflake className="h-2.5 w-2.5" /> Cooling
                          </span>
                        )}
                        {c.ghosting && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[rgb(242_90_60/8%)] text-action border border-[rgb(242_90_60/25%)] px-1.5 py-0.5 rounded">
                            <UserX className="h-2.5 w-2.5" /> Ghosting
                          </span>
                        )}
                      </div>
                      {c.name && <p className="text-xs text-[rgb(11_18_32/45%)] truncate">{c.email}</p>}
                      {(c.designation || c.company) && (
                        <p className="text-xs text-[rgb(11_18_32/50%)] mt-0.5 truncate">
                          {[c.designation, c.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${c.ghosting || c.cooling ? 'text-ink' : 'text-[rgb(11_18_32/50%)]'}`}>
                        {health}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[rgb(11_18_32/40%)]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />reply ~{fmtDur(c.typicalReplyHours)}</span>
                        <span>{c.exchangeCount} exchanges</span>
                        <span>last {timeAgo(c.lastInboundAt)}</span>
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); addToWatchlist(c) }}
                        disabled={watchingEmail === c.email}
                        title="Add to WatchList"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(11_18_32/30%)] hover:text-action hover:bg-[rgb(242_90_60/6%)] transition-colors disabled:opacity-40"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteContact(c) }}
                        disabled={deletingEmail === c.email || !c.id}
                        title="Delete contact"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(11_18_32/30%)] hover:text-action hover:bg-[rgb(242_90_60/6%)] transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openDrawer(c) }}
                        title="View details"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(11_18_32/30%)] hover:text-ink hover:bg-[rgb(11_18_32/5%)] transition-colors"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Detail drawer */}
      {drawer && edit && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20" onClick={closeDrawer} />
          {/* Panel */}
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[rgb(11_18_32/8%)] px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(11_18_32/8%)] text-sm font-bold text-ink">
                {initials(drawer.name, drawer.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink truncate">{drawer.name || drawer.email}</p>
                {drawer.name && <p className="text-xs text-[rgb(11_18_32/45%)] truncate">{drawer.email}</p>}
              </div>
              <button onClick={closeDrawer} className="text-[rgb(11_18_32/35%)] hover:text-ink transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats row */}
            <div className="flex border-b border-[rgb(11_18_32/8%)] divide-x divide-[rgb(11_18_32/8%)]">
              {[
                { label: 'Exchanges', value: drawer.exchangeCount },
                { label: 'Avg reply', value: fmtDur(drawer.typicalReplyHours) },
                { label: 'Last email', value: timeAgo(drawer.lastInboundAt) },
              ].map(s => (
                <div key={s.label} className="flex-1 px-3 py-2.5 text-center">
                  <p className="text-sm font-bold text-ink">{s.value}</p>
                  <p className="text-[10px] text-[rgb(11_18_32/40%)] uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Editable fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Profile</p>

              <FieldRow icon={<Users className="h-3.5 w-3.5" />} label="Name">
                <input
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]"
                  placeholder="Full name"
                  value={edit.name}
                  onChange={e => setEdit(p => p ? { ...p, name: e.target.value } : p)}
                />
              </FieldRow>

              <FieldRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Title">
                <input
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]"
                  placeholder="Job title"
                  value={edit.designation}
                  onChange={e => setEdit(p => p ? { ...p, designation: e.target.value } : p)}
                />
              </FieldRow>

              <FieldRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Company">
                <input
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]"
                  placeholder="Company name"
                  value={edit.company}
                  onChange={e => setEdit(p => p ? { ...p, company: e.target.value } : p)}
                />
              </FieldRow>

              <FieldRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
                <input
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]"
                  placeholder="Phone number"
                  value={edit.phone}
                  onChange={e => setEdit(p => p ? { ...p, phone: e.target.value } : p)}
                />
              </FieldRow>

              <FieldRow icon={<MapPin className="h-3.5 w-3.5" />} label="City">
                <input
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]"
                  placeholder="City or location"
                  value={edit.city}
                  onChange={e => setEdit(p => p ? { ...p, city: e.target.value } : p)}
                />
              </FieldRow>

              <FieldRow icon={<Link2 className="h-3.5 w-3.5" />} label="LinkedIn">
                <input
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]"
                  placeholder="LinkedIn profile URL"
                  value={edit.linkedinUrl}
                  onChange={e => setEdit(p => p ? { ...p, linkedinUrl: e.target.value } : p)}
                />
              </FieldRow>

              <FieldRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                <span className="text-sm text-[rgb(11_18_32/55%)] truncate">{drawer.email}</span>
              </FieldRow>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Notes</p>
                <textarea
                  className="w-full rounded-lg border border-[rgb(11_18_32/12%)] bg-[rgb(11_18_32/2%)] px-3 py-2 text-sm text-ink resize-none focus:outline-none focus:ring-1 focus:ring-action/40 placeholder:text-[rgb(11_18_32/30%)]"
                  rows={3}
                  placeholder="Add notes about this contact…"
                  value={edit.notes}
                  onChange={e => setEdit(p => p ? { ...p, notes: e.target.value } : p)}
                />
              </div>

              {drawer.aiEnriched && (
                <p className="text-[11px] text-[rgb(11_18_32/35%)] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI-enriched
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-[rgb(11_18_32/8%)] p-4 flex gap-2 flex-wrap">
              <Button
                onClick={enrichContact}
                disabled={enriching || !drawer.id}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {enriching
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching…</>
                  : <><Sparkles className="h-3.5 w-3.5" /> Enrich with AI</>
                }
              </Button>
              <Button
                onClick={() => addToWatchlist(drawer)}
                disabled={watchingEmail === drawer.email}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Watch
              </Button>
              <Button
                onClick={() => deleteContact(drawer)}
                disabled={deletingEmail === drawer.email || !drawer.id}
                variant="outline"
                size="sm"
                className="gap-1.5 text-action border-action/30 hover:bg-[rgb(242_90_60/6%)]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <div className="flex-1" />
              <Button onClick={saveContact} disabled={saving || !drawer.id} size="sm">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-ink text-white text-sm px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </>
  )
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[rgb(11_18_32/10%)] bg-[rgb(11_18_32/2%)] px-3 py-2.5">
      <span className="text-[rgb(11_18_32/35%)] shrink-0">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] w-14 shrink-0">{label}</span>
      {children}
    </div>
  )
}
