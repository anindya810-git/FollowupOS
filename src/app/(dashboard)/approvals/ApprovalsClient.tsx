'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, X, CheckCheck, Send } from 'lucide-react'
import { playChime } from '@/lib/sounds'

interface Approval {
  id: string
  toEmail: string
  subject: string
  contentHtml: string
  createdAt: string
  item?: { title?: string | null; ownerName?: string | null; category?: string | null } | null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function ApprovalsClient() {
  const [approvals, setApprovals] = useState<Approval[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    fetch('/api/approvals')
      .then(r => r.ok ? r.json() : null)
      .then(d => setApprovals(Array.isArray(d?.approvals) ? d.approvals : []))
      .catch(() => setApprovals([]))
  }

  useEffect(() => { load() }, [])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        if (action === 'approve') playChime('done')
        setApprovals(prev => (prev ?? []).filter(a => a.id !== id))
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Header title="Approvals" />
      <main className="p-6 max-w-3xl">
        <p className="text-sm text-[rgb(11_18_32/55%)] mb-6 max-w-2xl">
          With approval mode on, Pendingly drafts your follow-ups but never sends them automatically.
          Review each one and approve with a single tap — or skip it.
        </p>

        {approvals === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[rgb(11_18_32/35%)]" />
          </div>
        ) : approvals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CheckCheck className="h-8 w-8 text-[rgb(11_18_32/25%)]" />
              <p className="text-sm font-medium text-ink">Nothing to approve</p>
              <p className="text-xs text-[rgb(11_18_32/55%)] max-w-sm">
                When approval mode is on (Settings → Automation), drafted follow-ups will appear here for one-tap approval.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {approvals.map(a => (
              <Card key={a.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{a.subject}</p>
                      <p className="text-xs text-[rgb(11_18_32/55%)] mt-0.5">
                        To {a.item?.ownerName ? `${a.item.ownerName} · ` : ''}<span className="font-mono">{a.toEmail}</span>
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-paper-2 border border-rule px-3 py-2">
                    <p className="text-xs text-[rgb(11_18_32/70%)] line-clamp-4 whitespace-pre-wrap">{stripHtml(a.contentHtml)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => act(a.id, 'approve')} disabled={busy === a.id}>
                      {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1.5" /> Approve &amp; send</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(a.id, 'reject')} disabled={busy === a.id}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Skip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
