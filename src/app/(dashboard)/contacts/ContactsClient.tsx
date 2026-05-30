'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Star, Snowflake, UserX, Users, Clock } from 'lucide-react'

interface ContactInsight {
  email: string
  name: string | null
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
  const days = Math.round(hours / 24)
  return `${days}d`
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  const days = Math.floor((Date.now() - d) / 86400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function initials(name: string | null, email: string): string {
  const base = (name || email).trim()
  const parts = base.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

type Filter = 'all' | 'vip' | 'cooling' | 'ghosting'

export function ContactsClient() {
  const [insights, setInsights] = useState<ContactInsight[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/contacts/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => setInsights(Array.isArray(d?.insights) ? d.insights : []))
      .catch(() => setInsights([]))
  }, [])

  const counts = {
    all: insights?.length ?? 0,
    vip: insights?.filter(i => i.vip).length ?? 0,
    cooling: insights?.filter(i => i.cooling).length ?? 0,
    ghosting: insights?.filter(i => i.ghosting).length ?? 0,
  }

  const shown = (insights ?? []).filter(i =>
    filter === 'all' ? true : filter === 'vip' ? i.vip : filter === 'cooling' ? i.cooling : i.ghosting,
  )

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'vip', label: `VIP (${counts.vip})` },
    { id: 'cooling', label: `Cooling (${counts.cooling})` },
    { id: 'ghosting', label: `Ghosting (${counts.ghosting})` },
  ]

  return (
    <>
      <Header title="Contacts" />
      <main className="p-6 max-w-3xl">
        <p className="text-sm text-[rgb(11_18_32/55%)] mb-5 max-w-2xl">
          Relationship intelligence learned from your email history — who matters, who you usually reply to fast,
          and who&apos;s slipping through the cracks.
        </p>

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

        {insights === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[rgb(11_18_32/35%)]" />
          </div>
        ) : shown.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Users className="h-8 w-8 text-[rgb(11_18_32/25%)]" />
              <p className="text-sm font-medium text-ink">No contacts here yet</p>
              <p className="text-xs text-[rgb(11_18_32/55%)] max-w-sm">
                As Pendingly scans your inbox, the people you correspond with — and how you engage with them — show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {shown.map(c => {
              const health = c.ghosting
                ? `You keep dropping this person — ${c.unrepliedCount} of ${c.inboundCount} messages went unanswered.`
                : c.cooling
                ? `You usually reply in ${fmtDur(c.typicalReplyHours)}; it's been ${fmtDur(c.currentGapHours)}. Relationship cooling.`
                : c.typicalReplyHours !== null
                ? `You usually reply within ${fmtDur(c.typicalReplyHours)}.`
                : 'Not enough history to gauge yet.'
              return (
                <Card key={c.email}>
                  <CardContent className="py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(11_18_32/8%)] text-[11px] font-bold text-ink">
                        {initials(c.name, c.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink truncate">{c.name || c.email}</span>
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
                        <p className={`text-xs mt-1 ${c.ghosting || c.cooling ? 'text-ink' : 'text-[rgb(11_18_32/55%)]'}`}>{health}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[rgb(11_18_32/40%)]" style={{ fontFamily: 'var(--font-mono)' }}>
                          <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />reply ~{fmtDur(c.typicalReplyHours)}</span>
                          <span>{c.exchangeCount} exchanges</span>
                          <span>last {timeAgo(c.lastInboundAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
