'use client'
import { useEffect, useState, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Loader2, Star, Snowflake, UserX, Users, Clock,
  Search, Trash2, Eye, Sparkles, X, ChevronRight,
  Phone, Briefcase, MapPin, Link2, Mail,
  SlidersHorizontal, UserPlus, Download, Share2,
  ChevronDown, Check, Copy,
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

interface NewContactForm {
  name: string; email: string; designation: string; company: string
  phone: string; city: string; notes: string; linkedinUrl: string
}

interface EditState {
  name: string; designation: string; company: string; phone: string
  city: string; notes: string; linkedinUrl: string
}

type FilterTab = 'all' | 'vip' | 'cooling' | 'ghosting'
type SortKey = 'vipScore' | 'exchanges' | 'lastEmail' | 'name'

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

function buildShareText(c: ContactInsight): string {
  const lines: string[] = []
  lines.push(`*${c.name || c.email}*`)
  if (c.designation || c.company)
    lines.push([c.designation, c.company].filter(Boolean).join(' at '))
  lines.push(`📧 ${c.email}`)
  if (c.phone) lines.push(`📞 ${c.phone}`)
  if (c.city) lines.push(`📍 ${c.city}`)
  if (c.linkedinUrl) lines.push(`🔗 ${c.linkedinUrl}`)
  return lines.join('\n')
}

function toEdit(c: ContactInsight): EditState {
  return {
    name: c.name ?? '', designation: c.designation ?? '', company: c.company ?? '',
    phone: c.phone ?? '', city: c.city ?? '', notes: c.notes ?? '', linkedinUrl: c.linkedinUrl ?? '',
  }
}

const EMPTY_NEW: NewContactForm = {
  name: '', email: '', designation: '', company: '', phone: '', city: '', notes: '', linkedinUrl: '',
}

export function ContactsClient() {
  const [insights, setInsights] = useState<ContactInsight[] | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterDesignation, setFilterDesignation] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterHasPhone, setFilterHasPhone] = useState(false)
  const [filterHasLinkedIn, setFilterHasLinkedIn] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('vipScore')
  const [drawer, setDrawer] = useState<ContactInsight | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)
  const [watchingEmail, setWatchingEmail] = useState<string | null>(null)
  const [shareContact, setShareContact] = useState<string | null>(null) // email
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newContact, setNewContact] = useState<NewContactForm>(EMPTY_NEW)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
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

  useEffect(() => {
    if (drawer && insights) {
      const fresh = insights.find(i => i.email === drawer.email)
      if (fresh) { setDrawer(fresh); setEdit(toEdit(fresh)) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights])

  // Close share dropdown on outside click
  const shareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!shareContact) return
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareContact(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [shareContact])

  const openDrawer = (c: ContactInsight) => { setDrawer(c); setEdit(toEdit(c)) }
  const closeDrawer = () => { setDrawer(null); setEdit(null) }

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
    } catch { showToast('Save failed') } finally { setSaving(false) }
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
    } catch { showToast('Enrichment failed') } finally { setEnriching(false) }
  }

  const deleteContact = async (c: ContactInsight) => {
    if (!c.id) return
    setDeletingEmail(c.email)
    try {
      await fetch(`/api/contacts/${c.id}`, { method: 'DELETE' })
      if (drawer?.email === c.email) closeDrawer()
      setInsights(prev => prev?.filter(i => i.email !== c.email) ?? null)
      showToast('Contact deleted')
    } catch { showToast('Delete failed') } finally { setDeletingEmail(null) }
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
    } catch { showToast('Failed to add') } finally { setWatchingEmail(null) }
  }

  const addContact = async () => {
    const email = newContact.email.trim()
    if (!email) { setAddError('Email is required'); return }
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })
      const d = await res.json()
      if (!res.ok) { setAddError(d.error || 'Failed to add contact'); return }
      showToast('Contact added')
      setShowAddModal(false)
      setNewContact(EMPTY_NEW)
      fetchInsights()
    } catch { setAddError('Failed to add contact') } finally { setAdding(false) }
  }

  const importContacts = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/contacts', { method: 'POST' })
      const d = await res.json()
      showToast(`Imported ${d.synced ?? 0} contacts from inbox`)
      fetchInsights()
    } catch { showToast('Import failed') } finally { setImporting(false) }
  }

  const copyToClipboard = async (text: string, email: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(null), 2000)
    } catch { showToast('Copy failed') }
  }

  const hasAdvancedFilters = !!(filterCompany || filterDesignation || filterCity || filterHasPhone || filterHasLinkedIn || sortBy !== 'vipScore')
  const clearAdvanced = () => {
    setFilterCompany(''); setFilterDesignation(''); setFilterCity('')
    setFilterHasPhone(false); setFilterHasLinkedIn(false); setSortBy('vipScore')
  }

  const counts = {
    all: insights?.length ?? 0,
    vip: insights?.filter(i => i.vip).length ?? 0,
    cooling: insights?.filter(i => i.cooling).length ?? 0,
    ghosting: insights?.filter(i => i.ghosting).length ?? 0,
  }

  const q = search.toLowerCase()
  const filtered = (insights ?? [])
    .filter(c => {
      const tab = filter === 'all' ? true : filter === 'vip' ? c.vip : filter === 'cooling' ? c.cooling : c.ghosting
      if (!tab) return false
      if (q && !c.email.toLowerCase().includes(q) && !(c.name?.toLowerCase().includes(q)) && !(c.company?.toLowerCase().includes(q)) && !(c.designation?.toLowerCase().includes(q)) && !(c.city?.toLowerCase().includes(q))) return false
      if (filterCompany && !c.company?.toLowerCase().includes(filterCompany.toLowerCase())) return false
      if (filterDesignation && !c.designation?.toLowerCase().includes(filterDesignation.toLowerCase())) return false
      if (filterCity && !c.city?.toLowerCase().includes(filterCity.toLowerCase())) return false
      if (filterHasPhone && !c.phone) return false
      if (filterHasLinkedIn && !c.linkedinUrl) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'exchanges': return b.exchangeCount - a.exchangeCount
        case 'lastEmail': return (b.lastInboundAt ?? '').localeCompare(a.lastInboundAt ?? '')
        case 'name': return (a.name || a.email).localeCompare(b.name || b.email)
        default: return b.vipScore - a.vipScore
      }
    })

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'vip', label: `VIP (${counts.vip})` },
    { id: 'cooling', label: `Cooling (${counts.cooling})` },
    { id: 'ghosting', label: `Ghosting (${counts.ghosting})` },
  ]

  const inputCls = 'h-8 rounded-md border border-[rgb(11_18_32/12%)] bg-white px-2.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-action/40 placeholder:text-[rgb(11_18_32/30%)]'

  return (
    <>
      <Header title="Contacts" />
      <main className="p-6 max-w-3xl">
        <p className="text-sm text-[rgb(11_18_32/55%)] mb-4 max-w-2xl">
          Relationship intelligence from your email history. People you&apos;ve had two-way conversations with.
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Add Contact
          </Button>
          <Button
            onClick={importContacts}
            disabled={importing}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {importing
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
              : <><Download className="h-3.5 w-3.5" /> Import from Inbox</>
            }
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(11_18_32/35%)]" />
          <Input
            placeholder="Search by name, email, company, title, or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgb(11_18_32/35%)] hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs + advanced toggle */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === t.id ? 'bg-ink text-white border-ink' : 'bg-white text-[rgb(11_18_32/60%)] border-[rgb(11_18_32/15%)] hover:border-[rgb(11_18_32/30%)]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all shrink-0 ${hasAdvancedFilters || showAdvanced ? 'border-action bg-[rgb(0_133_93/8%)] text-action' : 'border-[rgb(11_18_32/15%)] bg-white text-[rgb(11_18_32/55%)] hover:text-ink hover:border-[rgb(11_18_32/25%)]'}`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filters
            {hasAdvancedFilters && <span className="h-4 w-4 rounded-full bg-action text-white text-[10px] font-bold flex items-center justify-center">{[filterCompany, filterDesignation, filterCity, filterHasPhone ? '1' : '', filterHasLinkedIn ? '1' : '', sortBy !== 'vipScore' ? '1' : ''].filter(Boolean).length}</span>}
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced filters panel */}
        {showAdvanced && (
          <div className="mb-4 rounded-xl border border-[rgb(11_18_32/8%)] bg-[rgb(11_18_32/2%)] p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Company</p>
                <input value={filterCompany} onChange={e => setFilterCompany(e.target.value)} placeholder="Filter by company…" className={`${inputCls} w-full`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Title / Designation</p>
                <input value={filterDesignation} onChange={e => setFilterDesignation(e.target.value)} placeholder="Filter by title…" className={`${inputCls} w-full`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">City</p>
                <input value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Filter by city…" className={`${inputCls} w-full`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Sort By</p>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className={`${inputCls} w-full`}>
                  <option value="vipScore">Relevance (default)</option>
                  <option value="exchanges">Most exchanges</option>
                  <option value="lastEmail">Most recent</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer h-8">
                  <input type="checkbox" checked={filterHasPhone} onChange={e => setFilterHasPhone(e.target.checked)} className="h-3.5 w-3.5 accent-action" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Has phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer h-8">
                  <input type="checkbox" checked={filterHasLinkedIn} onChange={e => setFilterHasLinkedIn(e.target.checked)} className="h-3.5 w-3.5 accent-action" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Has LinkedIn</span>
                </label>
              </div>
            </div>
            {hasAdvancedFilters && (
              <div className="pt-1 border-t border-[rgb(11_18_32/8%)]">
                <button onClick={clearAdvanced} className="flex items-center gap-1 text-xs text-[rgb(11_18_32/50%)] hover:text-action transition-colors">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contact list */}
        {insights === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[rgb(11_18_32/35%)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgb(11_18_32/15%)] px-5 py-12 text-center">
            <Users className="h-8 w-8 text-[rgb(11_18_32/20%)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[rgb(11_18_32/50%)]">
              {search || hasAdvancedFilters ? 'No contacts match your filters' : 'No contacts here yet'}
            </p>
            <p className="text-xs text-[rgb(11_18_32/35%)] mt-1">
              {search || hasAdvancedFilters ? 'Try adjusting your filters.' : "Use 'Import from Inbox' to sync contacts, or add one manually."}
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
                <div key={c.email} className="rounded-xl border border-[rgb(11_18_32/8%)] bg-white overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <button onClick={() => openDrawer(c)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(11_18_32/8%)] text-[11px] font-bold text-ink hover:bg-[rgb(11_18_32/14%)] transition-colors">
                      {initials(c.name, c.email)}
                    </button>
                    <button onClick={() => openDrawer(c)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{c.name || c.email}</span>
                        {c.vip && <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded"><Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> VIP</span>}
                        {c.cooling && <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded"><Snowflake className="h-2.5 w-2.5" /> Cooling</span>}
                        {c.ghosting && <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[rgb(242_90_60/8%)] text-action border border-[rgb(242_90_60/25%)] px-1.5 py-0.5 rounded"><UserX className="h-2.5 w-2.5" /> Ghosting</span>}
                      </div>
                      {c.name && <p className="text-xs text-[rgb(11_18_32/45%)] truncate">{c.email}</p>}
                      {(c.designation || c.company) && <p className="text-xs text-[rgb(11_18_32/50%)] mt-0.5 truncate">{[c.designation, c.company].filter(Boolean).join(' · ')}</p>}
                      <p className={`text-xs mt-1 ${c.ghosting || c.cooling ? 'text-ink' : 'text-[rgb(11_18_32/50%)]'}`}>{health}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[rgb(11_18_32/40%)]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />reply ~{fmtDur(c.typicalReplyHours)}</span>
                        <span>{c.exchangeCount} exchanges</span>
                        <span>last {timeAgo(c.lastInboundAt)}</span>
                      </div>
                    </button>

                    {/* Per-card actions */}
                    <div className="flex items-center gap-1 shrink-0 relative">
                      {/* Share */}
                      <div ref={shareContact === c.email ? shareRef : undefined} className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setShareContact(shareContact === c.email ? null : c.email) }}
                          title="Share contact"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(11_18_32/30%)] hover:text-action hover:bg-[rgb(242_90_60/6%)] transition-colors"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        {shareContact === c.email && (
                          <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-xl border border-[rgb(11_18_32/10%)] bg-white shadow-lg overflow-hidden">
                            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] border-b border-[rgb(11_18_32/8%)]">Share via</p>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(buildShareText(c))}`}
                              target="_blank" rel="noreferrer"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-[rgb(11_18_32/4%)] transition-colors"
                              onClick={() => setShareContact(null)}
                            >
                              <span className="text-base">💬</span> WhatsApp
                            </a>
                            <a
                              href={`mailto:?subject=Contact: ${encodeURIComponent(c.name || c.email)}&body=${encodeURIComponent(buildShareText(c))}`}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-[rgb(11_18_32/4%)] transition-colors"
                              onClick={() => setShareContact(null)}
                            >
                              <Mail className="h-4 w-4 text-[rgb(11_18_32/40%)]" /> Email
                            </a>
                            <button
                              onClick={() => { copyToClipboard(buildShareText(c), c.email); setShareContact(null) }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-[rgb(11_18_32/4%)] transition-colors"
                            >
                              {copiedEmail === c.email
                                ? <><Check className="h-4 w-4 text-green-500" /> Copied!</>
                                : <><Copy className="h-4 w-4 text-[rgb(11_18_32/40%)]" /> Copy</>
                              }
                            </button>
                          </div>
                        )}
                      </div>
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

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowAddModal(false); setAddError(null) }} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(11_18_32/8%)]">
              <p className="font-semibold text-ink">Add Contact</p>
              <button onClick={() => { setShowAddModal(false); setAddError(null) }} className="text-[rgb(11_18_32/35%)] hover:text-ink transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Email *</label>
                <Input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="mt-1" autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Name</label>
                <Input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} placeholder="Full name" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Job Title</label>
                  <Input value={newContact.designation} onChange={e => setNewContact(p => ({ ...p, designation: e.target.value }))} placeholder="Title" className="mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Company</label>
                  <Input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Phone</label>
                  <Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="+91 …" className="mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">City</label>
                  <Input value={newContact.city} onChange={e => setNewContact(p => ({ ...p, city: e.target.value }))} placeholder="City" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">LinkedIn URL</label>
                <Input value={newContact.linkedinUrl} onChange={e => setNewContact(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/…" className="mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Notes</label>
                <textarea value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} placeholder="Notes…" rows={2} className="mt-1 w-full rounded-lg border border-[rgb(11_18_32/12%)] bg-[rgb(11_18_32/2%)] px-3 py-2 text-sm text-ink resize-none focus:outline-none focus:ring-1 focus:ring-action/40 placeholder:text-[rgb(11_18_32/30%)]" />
              </div>
              {addError && <p className="text-xs text-action">{addError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[rgb(11_18_32/8%)]">
              <Button variant="outline" size="sm" onClick={() => { setShowAddModal(false); setAddError(null) }}>Cancel</Button>
              <Button size="sm" onClick={addContact} disabled={adding || !newContact.email.trim()}>
                {adding ? 'Adding…' : 'Add Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {drawer && edit && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/20" onClick={closeDrawer} />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-hidden">
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
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Profile</p>
              {([
                { icon: <Users className="h-3.5 w-3.5" />, label: 'Name', field: 'name' as const, placeholder: 'Full name' },
                { icon: <Briefcase className="h-3.5 w-3.5" />, label: 'Title', field: 'designation' as const, placeholder: 'Job title' },
                { icon: <Briefcase className="h-3.5 w-3.5" />, label: 'Company', field: 'company' as const, placeholder: 'Company name' },
                { icon: <Phone className="h-3.5 w-3.5" />, label: 'Phone', field: 'phone' as const, placeholder: 'Phone number' },
                { icon: <MapPin className="h-3.5 w-3.5" />, label: 'City', field: 'city' as const, placeholder: 'City or location' },
                { icon: <Link2 className="h-3.5 w-3.5" />, label: 'LinkedIn', field: 'linkedinUrl' as const, placeholder: 'LinkedIn profile URL' },
              ] as const).map(f => (
                <div key={f.field} className="flex items-center gap-2.5 rounded-lg border border-[rgb(11_18_32/10%)] bg-[rgb(11_18_32/2%)] px-3 py-2.5">
                  <span className="text-[rgb(11_18_32/35%)] shrink-0">{f.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] w-14 shrink-0">{f.label}</span>
                  <input className="flex-1 min-w-0 border-0 bg-transparent text-sm text-ink focus:outline-none placeholder:text-[rgb(11_18_32/30%)]" placeholder={f.placeholder} value={edit[f.field]} onChange={e => setEdit(p => p ? { ...p, [f.field]: e.target.value } : p)} />
                </div>
              ))}
              <div className="flex items-center gap-2.5 rounded-lg border border-[rgb(11_18_32/10%)] bg-[rgb(11_18_32/2%)] px-3 py-2.5">
                <span className="text-[rgb(11_18_32/35%)] shrink-0"><Mail className="h-3.5 w-3.5" /></span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] w-14 shrink-0">Email</span>
                <span className="text-sm text-[rgb(11_18_32/55%)] truncate">{drawer.email}</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Notes</p>
                <textarea className="w-full rounded-lg border border-[rgb(11_18_32/12%)] bg-[rgb(11_18_32/2%)] px-3 py-2 text-sm text-ink resize-none focus:outline-none focus:ring-1 focus:ring-action/40 placeholder:text-[rgb(11_18_32/30%)]" rows={3} placeholder="Add notes…" value={edit.notes} onChange={e => setEdit(p => p ? { ...p, notes: e.target.value } : p)} />
              </div>
              {drawer.aiEnriched && <p className="text-[11px] text-[rgb(11_18_32/35%)] flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI-enriched</p>}
            </div>
            <div className="border-t border-[rgb(11_18_32/8%)] p-4 flex gap-2 flex-wrap">
              <Button onClick={enrichContact} disabled={enriching || !drawer.id} variant="outline" size="sm" className="gap-1.5">
                {enriching ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching…</> : <><Sparkles className="h-3.5 w-3.5" /> Enrich with AI</>}
              </Button>
              <Button onClick={() => addToWatchlist(drawer)} disabled={watchingEmail === drawer.email} variant="outline" size="sm" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Watch
              </Button>
              <Button onClick={() => deleteContact(drawer)} disabled={deletingEmail === drawer.email || !drawer.id} variant="outline" size="sm" className="gap-1.5 text-action border-action/30 hover:bg-[rgb(242_90_60/6%)]">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <div className="flex-1" />
              <Button onClick={saveContact} disabled={saving || !drawer.id} size="sm">{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-ink text-white text-sm px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </>
  )
}
