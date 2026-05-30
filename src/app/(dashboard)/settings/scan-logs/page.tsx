'use client'
import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, ChevronDown, ArrowLeft } from 'lucide-react'

interface ScanJobLog {
  id: string
  accountEmail: string
  accountProvider: string
  status: string
  threadsFound: number
  threadsProcessed: number
  actionItemsCreated: number
  errorMessage: string | null
  debugLog: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-[rgb(11_18_32/8%)] text-[rgb(11_18_32/60%)]',
  running: 'bg-[rgb(99_102_241/12%)] text-[rgb(79_70_229)]',
  completed: 'bg-[rgb(34_197_94/12%)] text-[rgb(21_128_61)]',
  failed: 'bg-[rgb(242_90_60/12%)] text-action',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleString()
}

export default function ScanLogsPage() {
  const [jobs, setJobs] = useState<ScanJobLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const r = await fetch('/api/scan/logs', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json()
      setJobs(d.jobs || [])
      setMigrationPending(!!d.migrationPending)
    } catch {
      /* keep last good data */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Auto-refresh every 2s while any job is still active.
  useEffect(() => {
    const active = jobs.some(j => j.status === 'queued' || j.status === 'running')
    if (!active) return
    const id = setInterval(fetchLogs, 2000)
    return () => clearInterval(id)
  }, [jobs, fetchLogs])

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const manualRefresh = async () => {
    setRefreshing(true)
    await fetchLogs()
    setTimeout(() => setRefreshing(false), 400)
  }

  return (
    <>
      <Header title="Scan Logs" />
      <main className="p-6 max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <a href="/settings" className="inline-flex items-center gap-1.5 text-xs text-[rgb(11_18_32/55%)] hover:text-ink transition-colors mb-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
            </a>
            <p className="text-sm text-[rgb(11_18_32/55%)]">
              Step-by-step diagnostics for your last 20 scans. Click a scan to see the full trace —
              useful when a sync doesn&apos;t behave as expected. Times are UTC.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={manualRefresh} disabled={refreshing} className="shrink-0">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Refresh
          </Button>
        </div>

        {migrationPending && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-900">Full step-by-step traces are off until one DB column is added</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Status and result messages below are live now. To capture the detailed trace, run this in Supabase → SQL Editor:
            </p>
            <code className="mt-1.5 block text-[11px] bg-white/70 rounded border border-amber-200 px-2 py-1 font-mono text-amber-900">
              ALTER TABLE &quot;ScanJob&quot; ADD COLUMN IF NOT EXISTS &quot;debugLog&quot; TEXT;
            </code>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[rgb(11_18_32/55%)] py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading scan history…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-[rgb(11_18_32/8%)] bg-paper p-8 text-center">
            <p className="text-sm text-[rgb(11_18_32/55%)]">No scans yet. Run a sync from Settings → Inboxes and the trace will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {jobs.map(job => {
              const isOpen = expanded.has(job.id)
              const isActive = job.status === 'queued' || job.status === 'running'
              const statusClass = STATUS_STYLES[job.status] ?? STATUS_STYLES.queued
              return (
                <div key={job.id} className="rounded-lg border border-[rgb(11_18_32/8%)] bg-white overflow-hidden">
                  <button
                    onClick={() => toggle(job.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-paper transition-colors"
                  >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[rgb(11_18_32/40%)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 ${statusClass}`}>
                      {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                      {job.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{job.accountEmail}</p>
                      <p className="text-[11px] text-[rgb(11_18_32/50%)]">
                        {job.threadsProcessed}/{job.threadsFound} threads · {job.actionItemsCreated} action items · {timeAgo(job.createdAt)}
                      </p>
                    </div>
                    {job.errorMessage && (
                      <span className="text-[11px] text-action truncate max-w-[40%] shrink-0" title={job.errorMessage}>
                        {job.errorMessage}
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[rgb(11_18_32/8%)] bg-[rgb(11_18_32/2%)] px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <Stat label="Provider" value={job.accountProvider} />
                        <Stat label="Threads found" value={String(job.threadsFound)} />
                        <Stat label="Processed" value={String(job.threadsProcessed)} />
                        <Stat label="Action items" value={String(job.actionItemsCreated)} />
                        <Stat label="Started" value={new Date(job.createdAt).toLocaleString()} />
                        <Stat label="Last update" value={new Date(job.updatedAt).toLocaleString()} />
                        <Stat label="Job ID" value={job.id} mono />
                      </div>
                      {job.errorMessage && (
                        <div className="rounded-md border border-[rgb(242_90_60/20%)] bg-[rgb(242_90_60/6%)] px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-action mb-0.5">Result message</p>
                          <p className="text-xs text-ink whitespace-pre-wrap break-words">{job.errorMessage}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/45%)] mb-1">Trace</p>
                        {job.debugLog ? (
                          <pre className="text-[11px] leading-relaxed text-[rgb(11_18_32/75%)] bg-white rounded-md border border-[rgb(11_18_32/10%)] p-3 overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono">
                            {job.debugLog}
                          </pre>
                        ) : (
                          <p className="text-xs text-[rgb(11_18_32/45%)] italic">
                            No trace captured for this scan (it predates logging, or the function was killed before writing).
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/40%)]">{label}</p>
      <p className={`text-xs text-ink truncate ${mono ? 'font-mono' : 'capitalize'}`} title={value}>{value}</p>
    </div>
  )
}
