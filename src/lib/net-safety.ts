/**
 * Network safety helpers — prevent SSRF by rejecting hostnames that point
 * to private, link-local, or loopback addresses. Used before issuing
 * outbound requests / SMTP connections derived from user input.
 */

// IPv4 dotted-quad with 4 octets 0-255
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

// Basic public-hostname rule: at least one dot, only DNS-safe characters.
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

function isPrivateIPv4(host: string): boolean {
  const m = host.match(IPV4_RE)
  if (!m) return false
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)]
  if ([a, b, parseInt(m[3], 10), parseInt(m[4], 10)].some(n => isNaN(n) || n < 0 || n > 255)) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true // link-local / AWS metadata
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a >= 224) return true // multicast / reserved
  return false
}

export function isSafePublicHostname(host: string | null | undefined): boolean {
  if (!host) return false
  const h = host.trim().toLowerCase()
  if (!h) return false
  // Obvious local names
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  // IPv6 loopback or any bracketed IPv6 — reject (we can't safely validate without DNS)
  if (h === '::1' || h.includes(':')) return false
  // Private IPv4
  if (IPV4_RE.test(h)) return !isPrivateIPv4(h)
  // Must look like a real public hostname
  return HOSTNAME_RE.test(h)
}

export function isSafeHttpsUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    return isSafePublicHostname(u.hostname)
  } catch {
    return false
  }
}

export function isSlackWebhookUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname === 'hooks.slack.com'
  } catch {
    return false
  }
}
