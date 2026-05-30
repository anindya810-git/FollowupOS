'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ActionCard } from '@/components/action/ActionCard'
import { PendinglyLoader } from '@/components/ui/PendinglyLoader'
import { ActionDrawer } from '@/components/action/ActionDrawer'
import { SnoozeMenu } from '@/components/action/SnoozeMenu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterSelect, type FilterOption } from '@/components/ui/filter-select'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
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

  // Status (action) and category are independent filters.
  const [status, setStatus] = useState(searchParams.get('status') || 'open')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [priority, setPriority] = useState(searchParams.get('priority') || '')
  const [emailFrom, setEmailFrom] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [actionFrom, setActionFrom] = useState('')
  const [actionTo, setActionTo] = useState('')
  const [inboxId, setInboxId] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderDomain, setSenderDomain] = useState('')
  const [keywords, setKeywords] = useState('')
  const [hasAttachment, setHasAttachment] = useState(false)
  const [inboxes, setInboxes] = useState<EmailAccount[]>([])

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.accounts) setInboxes(d.accounts) })
      .catch(() => {})
  }, [])

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
    if (inboxId) params.set('inbox_id', inboxId)
    if (senderEmail) params.set('sender_email', senderEmail)
    if (senderDomain) params.set('sender_domain', senderDomain)
    if (keywords) params.set('keywords', keywords)
    if (hasAttachment) params.set('has_attachment', '1')

    const res = await fetch(`/api/action-items?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [status, category, priority, search, emailFrom, emailTo, actionFrom, actionTo, inboxId, senderEmail, senderDomain, keywords, hasAttachment, page])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1) }, [status, category, priority, search, emailFrom, emailTo, actionFrom, actionTo, inboxId, senderEmail, senderDomain, keywords, hasAttachment])
  useEffect(() => { setSelectedIds(new Set()) }, [status, category, priority, search, emailFrom, emailTo, actionFrom, actionTo, inboxId, senderEmail, senderDomain, keywords, hasAttachment, page])

  const hasAdvancedFilters = !!(priority || emailFrom || emailTo || actionFrom || actionTo || inboxId || senderEmail || senderDomain || keywords || hasAttachment)
  const clearAdvanced = () => {
    setPriority('')
    setEmailFrom('')
    setEmailTo('')
    setActionFrom('')
    setActionTo('')
    setInboxId('')
    setSenderEmail('')
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
      <main className="p-6">

        {/* ── Status (action) tabs + search/filters ── */}
        <div className="flex items-center justify-between gap-3 mb-3">
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

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(11_18_32/30%)]" />
              <Input
                placeholder="Search…"
                className="pl-8 h-9 w-52 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all ${
                hasAdvancedFilters || showAdvanced
                  ? 'border-action bg-[rgb(0_133_93/8%)] text-action'
                  : 'border-rule bg-white text-[rgb(11_18_32/60%)] hover:text-ink hover:border-[rgb(11_18_32/25%)]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Advanced Filters
              {hasAdvancedFilters && (
                <span className="h-4 w-4 rounded-full bg-action text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {[priority, emailFrom, emailTo, actionFrom, actionTo, inboxId, senderEmail, senderDomain, keywords, hasAttachment ? '1' : ''].filter(Boolean).length}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">

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
                <FilterSelect
                  value={inboxId}
                  onChange={setInboxId}
                  options={[
                    { value: '', label: 'All inboxes' },
                    ...inboxes.map((acc): FilterOption => ({
                      value: acc.id,
                      label: acc.emailAddress,
                      initials: acc.emailAddress.slice(0, 2).toUpperCase(),
                      avatarColor: '#6366f1',
                    })),
                  ]}
                  className="w-full"
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
                  <input type="date" value={emailFrom} onChange={e => setEmailFrom(e.target.value)} className={inputClass} aria-label="Email date from" />
                  <span className="text-xs text-[rgb(11_18_32/40%)]">to</span>
                  <input type="date" value={emailTo} onChange={e => setEmailTo(e.target.value)} className={inputClass} aria-label="Email date to" />
                </div>
              </div>

              {/* Row 4: Action due date range */}
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)] mb-1.5">Action due date</p>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={actionFrom} onChange={e => setActionFrom(e.target.value)} className={inputClass} aria-label="Action date from" />
                  <span className="text-xs text-[rgb(11_18_32/40%)]">to</span>
                  <input type="date" value={actionTo} onChange={e => setActionTo(e.target.value)} className={inputClass} aria-label="Action date to" />
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-ink text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-fade-up">
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

export default function QueuePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><PendinglyLoader size={56} /></div>}>
      <QueueContent />
    </Suspense>
  )
}
