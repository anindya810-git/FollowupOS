'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ActionCard } from '@/components/action/ActionCard'
import { ActionDrawer } from '@/components/action/ActionDrawer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { categoryLabel } from '@/lib/utils'
import { Search, Loader2 } from 'lucide-react'
import type { ActionItemWithThread } from '@/types'

function QueueContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ActionItemWithThread[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ActionItemWithThread | null>(null)

  const status = searchParams.get('status') || 'open'
  const category = searchParams.get('category') || ''
  const priority = searchParams.get('priority') || ''

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status, page: String(page), limit: '20' })
    if (category) params.set('category', category)
    if (priority) params.set('priority', priority)
    if (search) params.set('search', search)

    const res = await fetch(`/api/action-items?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [status, category, priority, search, page])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleStatusChange = async (id: string, statusVal: string, extra?: Record<string, string>) => {
    await fetch(`/api/action-items/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusVal, ...extra }),
    })
    fetchItems()
  }

  const title = category
    ? categoryLabel(category)
    : status === 'snoozed' ? 'Snoozed' : status === 'ignored' ? 'Ignored' : 'Action Queue'

  return (
    <>
      <Header title={title} onSync={fetchItems} />
      <main className="p-6">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(11_18_32/30%)]" />
            <Input
              placeholder="Search by subject, contact..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-action" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-white border border-[rgb(11_18_32/8%)] p-12 text-center">
            <p className="text-[rgb(11_18_32/55%)] text-lg">No items found.</p>
            <p className="text-[rgb(11_18_32/30%)] text-sm mt-1">
              {status === 'open' ? 'Your inbox is clear — no follow-ups needed.' : 'Nothing here yet.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[rgb(11_18_32/55%)] mb-3">{total} items</p>
            <div className="space-y-3">
              {items.map(item => (
                <ActionCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelectedItem}
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
    </>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <QueueContent />
    </Suspense>
  )
}
