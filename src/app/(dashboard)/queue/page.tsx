'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ActionCard } from '@/components/action/ActionCard'
import { PendinglyLoader } from '@/components/ui/PendinglyLoader'
import { ActionDrawer } from '@/components/action/ActionDrawer'
import { SnoozeMenu } from '@/components/action/SnoozeMenu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/ui/filter-select'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, Check } from 'lucide-react'
import type { ActionItemWithThread } from '@/types'

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// Statuses = lifecycle "actions" an item moves through.
const STATUS_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'open',     label: 'Open' },
  { value: 'snoozed',  label: 'Snoozed' },
  { value: 'ignored',  label: 'Ignored' },
  { value: 'done',     label: 'Completed' },
]

// Categories = what kind of follow-up the item represents.
const CATEGORY_TABS = [
  { value: '',                   label: 'All' },
  { value: 'reply_needed',       label: 'Reply Needed' },
  { value: 'waiting_on_them',    label: 'Waiting on Them' },
  { value: 'followup_due',       label: 'Follow-up Due' },
  { value: 'overdue_commitment', label: 'Overdue' },
]

const inputClass = 'h-8 rounded-md border border-rule bg-white px-2.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-action'

interface EmailAccount {
  id: string
  emailAddress: string
  provider: string
}

function QueueContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ActionItemWithThread[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ActionItemWithThread | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [vipEmails, setVipEmails] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/contacts/vip')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d?.emails)) setVipEmails(new Set(d.emails.map((e: string) => e.toLowerCase()))) })
      .catch(() => {})
  }, [])

  // Determine whether an item's contact is an auto-detected VIP.
  const itemIsVip = useCallback((it: ActionItemWithThread): boolean => {
    if (vipEmails.size === 0) return false
    const inbound = it.emailThread?.messages?.find(m => !m.isFromUser)?.senderEmail
    const email = (inbound || it.ownerEmail || '').trim().toLowerCase()
    return !!email && vipEmails.has(email)
  }, [vipEmails])

  // Status (action) and category are independent filters.
  const [status, setStatus] = useState(searchParams.get('status') || 'open')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [priority, setPriority] = useState(searchParams.get('priority') || '')
  const [emailFrom, setEmailFrom] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [actionFrom, setActionFrom] = useState('')
  const [actionTo, setActionTo] = useState('')
  const [selectedInboxIds, setSelectedInboxIds] = useState<Set<string>>(new Set())
  const [senderEmail, setSenderEmail] = useState('')
  const [senderDomain, setSenderDomain] = useState('')
  const [keywords, setKeywords] = useState('')
  const [hasAttachment, setHasAttachment] = useState(false)
  const [selectedContactEmails, setSelectedContactEmails] = useState<Set<string>>(new Set())
  const [contacts, setContacts] = useState<Array<{ email: string; name: string | null }>>([])
  const [inboxes, setInboxes] = useState<EmailAccount[]>([])
  const inboxInitRef = useRef(false)

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.accounts) setInboxes(d.accounts) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/contacts/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (Array.isArray(d?.insights)) {
          setContacts(d.insights.map((i: { email: string; name: string | null }) => ({ email: i.email, name: i.name })))
        }
      })
      .catch(() => {})
  }, [])

  // Default: every inbox selected. The user can then deselect specific ones.
  useEffect(() => {
    if (!inboxInitRef.current && inboxes.length > 0) {
      inboxInitRef.current = true
      setSelectedInboxIds(new Set(inboxes.map(i => i.id)))
    }
  }, [inboxes])

  // Build the inbox_id query param: empty (= all) when every inbox is selected,
  // otherwise the comma-joined subset.
  const allInboxIds = inboxes.map(i => i.id)
  const allInboxesSelected = allInboxIds.length > 0 && selectedInboxIds.size === allInboxIds.length
  const inboxParam = (allInboxesSelected || selectedInboxIds.size === 0)
    ? ''
    : allInboxIds.filter(id => selectedInboxIds.has(id)).join(',')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status, page: String(page), limit: '20' })
    if (category) params.set('category', category)
    if (priority) params.set('priority', priority)
    if (search) params.set('search', search)
    if (emailFrom) params.set('email_from', emailFrom)
    if (emailTo) params.set('email_to', emailTo)
    if (actionFrom) params.set('action_from', actionFrom)
    if (actionTo) params.set('action_to', actionTo)
    if (inboxParam) params.set('inbox_id', inboxParam)
    if (senderEmail) params.set('sender_email', senderEmail)
    if (selectedContactEmails.size > 0) params.set('contact_emails', Array.from(selectedContactEmails).join(','))
    if (senderDomain) params.set('sender_domain', senderDomain)
    if (keywords) params.set('keywords', keywords)
    if (hasAttachment) params.set('has_attachment', '1')

    const res = await fetch(`/api/action-items?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [status, category, priority, search, emailFrom, emailTo, actionFrom, actionTo, inboxParam, senderEmail, selectedContactEmails, senderDomain, keywords, hasAttachment, page])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1) }, [status, category, priority, search, emailFrom, emailTo, actionFrom, actionTo, inboxParam, senderEmail, selectedContactEmails, senderDomain, keywords, hasAttachment])
  useEffect(() => { setSelectedIds(new Set()) }, [status, category, priority, search, emailFrom, emailTo, actionFrom, actionTo, inboxParam, senderEmail, selectedContactEmails, senderDomain, keywords, hasAttachment, page])

  const hasAdvancedFilters = !!(priority || emailFrom || emailTo || actionFrom || actionTo || inboxParam || senderEmail || selectedContactEmails.size > 0 || senderDomain || keywords || hasAttachment)
  const clearAdvanced = () => {
    setPriority('')
    setEmailFrom('')
    setEmailTo('')
    setActionFrom('')
    setActionTo('')
    setSelectedInboxIds(new Set(allInboxIds))  // back to all inboxes
    setSenderEmail('')
    setSelectedContactEmails(new Set())
    setSenderDomain('')
    setKeywords('')
    setHasAttachment(false)
  }

  const handleStatusChange = async (id: string, statusVal: string, extra?: Record<string, string>) => {
    await fetch(`/api/action-items/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusVal, ...extra }),
    })
    fetchItems()
  }

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const bulk = async (action: string, snoozed_until?: string) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    await fetch('/api/action-items/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, snoozed_until }),
    })
    setSelectedIds(new Set())
    fetchItems()
  }

  return (
    <>
      <Header title="All Items" onSync={fetchItems} />
      <main className="p-4 md:p-6">

        {/* ── Prominent search bar ── */}
        <div className="relative mx-auto mb-4 w-full max-w-3xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(11_18_32/35%)]" />
          <Input
            placeholder="Search subjects, people, or thread content…"
            className="h-12 w-full rounded-xl pl-11 pr-10 text-[15px] shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgb(11_18_32/35%)] hover:text-ink transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Status (action) tabs + advanced filters ── */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-0.5 p-1 bg-[rgb(11_18_32/5%)] rounded-xl border border-rule">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  status === tab.value
                    ? 'bg-white text-ink shadow-sm border border-rule'
                    : 'text-[rgb(11_18_32/55%)] hover:text-ink hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all shrink-0 ${
              hasAdvancedFilters || showAdvanced
                ? 'border-action bg-[rgb(0_133_93/8%)] text-action'
                : 'border-rule bg-white text-[rgb(11_18_32/60%)] hover:text-ink hover:border-[rgb(11_18_32/25%)]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Advanced Filters
            {hasAdvancedFilters && (
              <span className="h-4 w-4 rounded-full bg-action text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {[priority, emailFrom, emailTo, actionFrom, actionTo, inboxParam, senderEmail, selectedContactEmails.size > 0 ? '1' : '', senderDomain, keywords, hasAttachment ? '1' : ''].filter(Boolean).length}
              </span>
            )}
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* ── Category filter pills ── */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mr-1">Category</span>
          {CATEGORY_TABS.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1 rounded-full text-[13px] font-medium border transition-all ${
                category === cat.value
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-[rgb(11_18_32/55%)] border-rule hover:text-ink hover:border-[rgb(11_18_32/25%)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Advanced filters panel ── */}
        {showAdvanced && (
          <div className="mb-5 p-4 rounded-xl bg-[rgb(11_18_32/3%)] border border-rule space-y-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-4">

              {/* Row 1: Priority + Inbox */}
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Priority</p>
                <FilterSelect
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: '', label: 'All priorities' },
                    { value: 'high', label: 'High', dot: '#ef4444' },
                    { value: 'medium', label: 'Medium', dot: '#f59e0b' },
                    { value: 'low', label: 'Low', dot: '#6366f1' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Inbox</p>
                <InboxMultiSelect
                  inboxes={inboxes}
                  selected={selectedInboxIds}
                  onChange={setSelectedInboxIds}
                />
              </div>

              {/* Row 2: From User + From Domain */}
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">From user</p>
                <input
                  type="text"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                  placeholder="name or email…"
                  className={`${inputClass} w-full`}
                  aria-label="From user filter"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">From domain</p>
                <input
                  type="text"
                  value={senderDomain}
                  onChange={e => setSenderDomain(e.target.value)}
                  placeholder="e.g. acme.com"
                  className={`${inputClass} w-full`}
                  aria-label="From domain filter"
                />
              </div>

              {/* Contact filter */}
              <div className="col-span-2 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Contact</p>
                <ContactMultiSelect
                  contacts={contacts}
                  selected={selectedContactEmails}
                  onChange={setSelectedContactEmails}
                />
              </div>

              {/* Row 3: Keywords + Has Attachment */}
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Has keywords</p>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="words to search in subject or thread…"
                  className={`${inputClass} w-full`}
                  aria-label="Keywords filter"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer h-8">
                  <input
                    type="checkbox"
                    checked={hasAttachment}
                    onChange={e => setHasAttachment(e.target.checked)}
                    className="h-3.5 w-3.5 accent-action"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Has attachment</span>
                </label>
              </div>

              {/* Row 4: Email date range */}
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Email date</p>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={emailFrom} onChange={e => setEmailFrom(e.target.value)} className={`${inputClass} min-w-0 flex-1`} aria-label="Email date from" />
                  <span className="text-xs text-[rgb(11_18_32/40%)] shrink-0">to</span>
                  <input type="date" value={emailTo} onChange={e => setEmailTo(e.target.value)} className={`${inputClass} min-w-0 flex-1`} aria-label="Email date to" />
                </div>
              </div>

              {/* Row 4: Action due date range */}
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Action due date</p>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={actionFrom} onChange={e => setActionFrom(e.target.value)} className={`${inputClass} min-w-0 flex-1`} aria-label="Action date from" />
                  <span className="text-xs text-[rgb(11_18_32/40%)] shrink-0">to</span>
                  <input type="date" value={actionTo} onChange={e => setActionTo(e.target.value)} className={`${inputClass} min-w-0 flex-1`} aria-label="Action date to" />
                </div>
              </div>
            </div>

            {hasAdvancedFilters && (
              <div className="pt-1 border-t border-rule">
                <button
                  onClick={clearAdvanced}
                  className="flex items-center gap-1 text-xs text-[rgb(11_18_32/50%)] hover:text-action transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <PendinglyLoader size={56} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-white border border-[rgb(11_18_32/8%)] p-12 text-center">
            <p className="text-[rgb(11_18_32/55%)] text-lg">No items found.</p>
            <p className="text-[rgb(11_18_32/30%)] text-sm mt-1">
              {status === 'done' ? 'Nothing completed yet.' :
               status === 'snoozed' ? 'No snoozed items.' :
               status === 'ignored' ? 'No ignored items.' :
               status === 'open' ? 'Your inbox is clear — no follow-ups needed.' :
               'No items match your filters.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[rgb(11_18_32/55%)] mb-3">{total} item{total !== 1 ? 's' : ''}</p>
            <div className="space-y-3">
              {items.map(item => (
                <ActionCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelectedItem}
                  selected={selectedIds.has(item.id)}
                  onSelectChange={(checked) => toggleSelected(item.id, checked)}
                  isVip={itemIsVip(item)}
                />
              ))}
            </div>
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </main>

      <ActionDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onStatusChange={handleStatusChange}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-ink text-white rounded-lg shadow-lg px-4 py-3 flex items-center justify-center gap-x-3 gap-y-2 flex-wrap max-w-[calc(100vw-1.5rem)] animate-fade-up">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-white/20" />
          <button onClick={() => bulk('done')} className="text-sm hover:text-action transition-colors">Mark Done</button>
          <SnoozeMenu onSelect={(d) => bulk('snoozed', d)}>
            <button className="text-sm hover:text-action transition-colors">Snooze</button>
          </SnoozeMenu>
          <button onClick={() => bulk('snoozed', tomorrow())} className="text-sm hover:text-action transition-colors">Snooze 1d</button>
          <button onClick={() => bulk('ignored')} className="text-sm hover:text-action transition-colors">Ignore</button>
          <div className="h-4 w-px bg-white/20" />
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-white/60 hover:text-white">Clear</button>
        </div>
      )}
    </>
  )
}

// Multi-select inbox filter: every inbox is checked by default; deselect to
// narrow the queue to specific inboxes.
function InboxMultiSelect({
  inboxes,
  selected,
  onChange,
}: {
  inboxes: EmailAccount[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const total = inboxes.length
  const count = selected.size
  const allSelected = total > 0 && count === total
  const label = total === 0
    ? 'No inboxes'
    : allSelected || count === 0
      ? 'All inboxes'
      : count === 1
        ? (inboxes.find(i => selected.has(i.id))?.emailAddress ?? '1 inbox')
        : `${count} inboxes`

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-rule bg-white px-2.5 text-sm text-ink shadow-sm hover:border-[rgb(11_18_32/22%)] transition-colors focus:outline-none focus:ring-2 focus:ring-action/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[rgb(11_18_32/35%)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-full rounded-xl border border-[rgb(11_18_32/10%)] bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgb(11_18_32/8%)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">Inboxes</span>
            <button
              type="button"
              onClick={() => onChange(allSelected ? new Set() : new Set(inboxes.map(i => i.id)))}
              className="text-[11px] font-medium text-action hover:underline"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="p-1 max-h-60 overflow-y-auto">
            {inboxes.map(acc => {
              const checked = selected.has(acc.id)
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggle(acc.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink hover:bg-[rgb(11_18_32/4%)] transition-colors"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'bg-action border-action' : 'border-[rgb(11_18_32/25%)] bg-white'}`}>
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="flex-1 text-left truncate">{acc.emailAddress}</span>
                </button>
              )
            })}
            {inboxes.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-[rgb(11_18_32/40%)]">No connected inboxes</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Searchable multi-select contact filter.
function ContactMultiSelect({
  contacts,
  selected,
  onChange,
}: {
  contacts: Array<{ email: string; name: string | null }>
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const q = query.toLowerCase()
  const filtered = contacts.filter(c =>
    !q ||
    c.email.toLowerCase().includes(q) ||
    (c.name?.toLowerCase().includes(q) ?? false)
  )

  const count = selected.size
  const label = count === 0
    ? 'All contacts'
    : count === 1
      ? (() => { const e = Array.from(selected)[0]; const c = contacts.find(x => x.email === e); return c?.name || e })()
      : `${count} contacts`

  const toggle = (email: string) => {
    const next = new Set(selected)
    if (next.has(email)) next.delete(email)
    else next.add(email)
    onChange(next)
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-rule bg-white px-2.5 text-sm text-ink shadow-sm hover:border-[rgb(11_18_32/22%)] transition-colors focus:outline-none focus:ring-2 focus:ring-action/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${count === 0 ? 'text-[rgb(11_18_32/45%)]' : ''}`}>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[rgb(11_18_32/35%)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-[rgb(11_18_32/10%)] bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[rgb(11_18_32/8%)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(11_18_32/35%)]" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search contacts…"
                className="w-full rounded-md border border-rule bg-white pl-8 pr-3 py-1.5 text-sm text-ink placeholder:text-[rgb(11_18_32/35%)] focus:outline-none focus:ring-1 focus:ring-action/40"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgb(11_18_32/8%)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">
              {count > 0 ? `${count} selected` : 'Contacts'}
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-[11px] font-medium text-action hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="p-1 max-h-60 overflow-y-auto">
            {filtered.map(c => {
              const checked = selected.has(c.email)
              return (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => toggle(c.email)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink hover:bg-[rgb(11_18_32/4%)] transition-colors"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'bg-action border-action' : 'border-[rgb(11_18_32/25%)] bg-white'}`}>
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="flex-1 text-left min-w-0">
                    {c.name && <span className="font-medium truncate block">{c.name}</span>}
                    <span className={`truncate block ${c.name ? 'text-xs text-[rgb(11_18_32/45%)]' : ''}`}>{c.email}</span>
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-[rgb(11_18_32/40%)]">No contacts match</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><PendinglyLoader size={56} /></div>}>
      <QueueContent />
    </Suspense>
  )
}
