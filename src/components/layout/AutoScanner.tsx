'use client'
import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_PREFIX = 'pendingly_scan_at_'
const CONFIG_TTL = 5 * 60_000

interface AccountInfo {
  id: string
  connectedStatus: string
  autoScanIntervalMinutes?: number | null
  lastSyncedAt?: string | null
}

interface Config {
  accounts: AccountInfo[]
  globalInterval: number
  fetchedAt: number
}

async function fetchConfig(): Promise<Config | null> {
  try {
    const [intRes, settingsRes] = await Promise.all([
      fetch('/api/integrations?basic=1'),
      fetch('/api/settings'),
    ])
    if (!intRes.ok || !settingsRes.ok) return null
    const { accounts } = await intRes.json()
    const { appSettings } = await settingsRes.json()
    return {
      accounts: accounts ?? [],
      globalInterval: appSettings?.autoScanIntervalMinutes ?? 1,
      fetchedAt: Date.now(),
    }
  } catch {
    return null
  }
}

export function AutoScanner() {
  const { status } = useSession()
  const configRef = useRef<Config | null>(null)
  // accountId → timestamp when we last triggered a scan for it
  const triggeredAtRef = useRef<Map<string, number>>(new Map())
  // accountId → lastSyncedAt value we last observed
  const lastSyncedRef = useRef<Map<string, string | null>>(new Map())

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    const triggerDueScans = (config: Config) => {
      const now = Date.now()
      for (const account of config.accounts) {
        if (account.connectedStatus !== 'connected') continue
        const intervalMs = (account.autoScanIntervalMinutes ?? config.globalInterval) * 60_000
        const lastKey = STORAGE_PREFIX + account.id
        const last = Number(localStorage.getItem(lastKey) ?? 0)
        if (now - last >= intervalMs) {
          localStorage.setItem(lastKey, String(now))
          triggeredAtRef.current.set(account.id, now)
          fetch('/api/scan/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: account.id }),
          }).catch(() => {})
        }
        // Seed the baseline on first observation
        if (!lastSyncedRef.current.has(account.id)) {
          lastSyncedRef.current.set(account.id, account.lastSyncedAt ?? null)
        }
      }
    }

    const checkCompletions = async () => {
      if (triggeredAtRef.current.size === 0) return
      try {
        const r = await fetch('/api/integrations?basic=1')
        if (!r.ok || cancelled) return
        const { accounts } = await r.json()
        let anyCompleted = false
        for (const account of (accounts ?? [])) {
          const triggerTime = triggeredAtRef.current.get(account.id)
          if (triggerTime === undefined) continue
          const newSynced = account.lastSyncedAt as string | null
          const prevSynced = lastSyncedRef.current.get(account.id) ?? null
          // Scan finished when lastSyncedAt is newer than when we triggered it
          const newSyncedMs = newSynced ? new Date(newSynced).getTime() : 0
          if (newSyncedMs > triggerTime) {
            triggeredAtRef.current.delete(account.id)
            anyCompleted = true
          }
          lastSyncedRef.current.set(account.id, newSynced)
        }
        if (anyCompleted) {
          window.dispatchEvent(new CustomEvent('pendingly:scan-complete'))
        }
      } catch {}
    }

    const run = async () => {
      if (!configRef.current || Date.now() - configRef.current.fetchedAt > CONFIG_TTL) {
        const cfg = await fetchConfig()
        if (cancelled) return
        if (cfg) configRef.current = cfg
      }
      if (configRef.current) triggerDueScans(configRef.current)
    }

    run()
    const runId = setInterval(run, 30_000)
    // Poll for scan completion every 5 s — cheap because it only acts when
    // triggeredAtRef is non-empty (i.e. we actually started a scan recently).
    const pollId = setInterval(checkCompletions, 5_000)

    return () => {
      cancelled = true
      clearInterval(runId)
      clearInterval(pollId)
    }
  }, [status])

  return null
}
