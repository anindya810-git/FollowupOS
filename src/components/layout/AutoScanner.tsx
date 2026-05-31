'use client'
import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_PREFIX = 'pendingly_scan_at_'
const CONFIG_TTL = 5 * 60_000 // re-fetch config at most every 5 minutes

interface AccountInfo {
  id: string
  connectedStatus: string
  autoScanIntervalMinutes?: number | null
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

function triggerDueScans(config: Config) {
  const now = Date.now()
  for (const account of config.accounts) {
    if (account.connectedStatus !== 'connected') continue
    const intervalMs = (account.autoScanIntervalMinutes ?? config.globalInterval) * 60_000
    const lastKey = STORAGE_PREFIX + account.id
    const last = Number(localStorage.getItem(lastKey) ?? 0)
    if (now - last >= intervalMs) {
      localStorage.setItem(lastKey, String(now))
      fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      }).catch(() => {})
    }
  }
}

export function AutoScanner() {
  const { status } = useSession()
  const configRef = useRef<Config | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    const run = async () => {
      if (!configRef.current || Date.now() - configRef.current.fetchedAt > CONFIG_TTL) {
        const cfg = await fetchConfig()
        if (cancelled) return
        if (cfg) configRef.current = cfg
      }
      if (configRef.current) triggerDueScans(configRef.current)
    }

    run()
    const id = setInterval(run, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [status])

  return null
}
