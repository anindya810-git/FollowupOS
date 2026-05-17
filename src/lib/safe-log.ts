/**
 * Strip API-key-like substrings from log output so a stray error object
 * containing a token doesn't leak into stdout / Vercel logs.
 */
const REDACT_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]+/g,
  /sk-proj-[A-Za-z0-9_-]+/g,
  /sk-svcacct-[A-Za-z0-9_-]+/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /AIza[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
  /ya29\.[A-Za-z0-9_-]+/g,
  /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, // JWT-shaped
]

function redact(input: string): string {
  let out = input
  for (const p of REDACT_PATTERNS) out = out.replace(p, '[REDACTED]')
  return out
}

export function safeLog(level: 'log' | 'warn' | 'error', label: string, error: unknown, context?: Record<string, string>) {
  const msg = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === 'string' ? error : 'unknown error'
  const ctx = context ? ' ' + Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ') : ''
  console[level](`[${label}] ${redact(msg)}${ctx}`)
}
