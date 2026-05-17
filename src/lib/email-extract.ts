export interface ExtractedLink { url: string; text: string }
export interface ExtractedAttachment {
  filename: string
  mimeType?: string
  sizeBytes?: number
  attachmentId?: string
}

const MAX_LINKS = 20
const MAX_ATTACHMENTS = 20

// Tracking / unsubscribe links we don't want to surface to the user as
// "click this link from the email".
const NOISY_LINK_HOSTS = [
  'click.', 'links.', 'track.', 'tracking.', 'email.', 'mailtrack.',
  'sendgrid.net', 'mailchimp.com', 'list-manage.com', 'mc.us', 'cmail',
  'mailgun.org', 'amazonses.com', 'sparkpostmail.com',
]
const NOISY_LINK_PATHS = ['/track', '/unsubscribe', '/opt-out', '/preferences']

function isNoisyLink(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (NOISY_LINK_HOSTS.some(p => host.includes(p))) return true
    if (NOISY_LINK_PATHS.some(p => u.pathname.toLowerCase().includes(p))) return true
    return false
  } catch {
    return true  // unparseable = noisy
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Extract <a href=…>…</a> pairs from raw HTML. Strips tracking-style hosts,
// dedupes by URL, caps at MAX_LINKS.
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  if (!html) return []
  const out: ExtractedLink[] = []
  const seen = new Set<string>()
  // Captures: 1=quote char, 2=href, 3=link text
  const re = /<a\s+[^>]*?href\s*=\s*("|')([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const url = decodeHtmlEntities(m[2].trim())
    if (!/^https?:\/\//i.test(url)) continue
    if (isNoisyLink(url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    const text = decodeHtmlEntities(
      m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    ) || url
    out.push({ url, text: text.length > 80 ? text.substring(0, 77) + '…' : text })
    if (out.length >= MAX_LINKS) break
  }
  return out
}

// Plain-text URL extractor. Used for Outlook (where the body is fetched as
// plain text) and as a fallback when no HTML is available. URLs only —
// no anchor text — so the UI shows the URL itself.
export function extractLinksFromText(text: string): ExtractedLink[] {
  if (!text) return []
  const out: ExtractedLink[] = []
  const seen = new Set<string>()
  const re = /https?:\/\/[^\s<>"')\]}]+/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    // Strip trailing punctuation common in prose (.,;:!?)
    const url = m[0].replace(/[.,;:!?]+$/, '')
    if (isNoisyLink(url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    let label = url
    try { label = new URL(url).hostname.replace(/^www\./, '') } catch { /* ignore */ }
    out.push({ url, text: label })
    if (out.length >= MAX_LINKS) break
  }
  return out
}

// Walk Gmail payload parts looking for inline attachments. Only returns
// real file attachments — skips inline images embedded in the body unless
// they have a filename.
interface GmailPart {
  filename?: string | null
  mimeType?: string | null
  body?: { attachmentId?: string | null; size?: number | null } | null
  parts?: GmailPart[] | null
}

export function extractGmailAttachments(payload: GmailPart): ExtractedAttachment[] {
  const out: ExtractedAttachment[] = []
  function walk(part: GmailPart) {
    if (part.filename && part.filename.trim().length > 0 && part.body?.attachmentId) {
      out.push({
        filename: part.filename,
        mimeType: part.mimeType || undefined,
        sizeBytes: part.body.size ?? undefined,
        attachmentId: part.body.attachmentId,
      })
    }
    if (part.parts) for (const p of part.parts) walk(p)
  }
  walk(payload)
  return out.slice(0, MAX_ATTACHMENTS)
}

// imapflow's MessageStructureObject is recursive. Filenames live in the
// `dispositionParameters.filename` or `parameters.name` fields. We keep
// this loose-typed because the imapflow type is large.
interface ImapPart {
  type?: string
  subtype?: string
  parameters?: { name?: string } | null
  dispositionParameters?: { filename?: string } | null
  disposition?: string | null
  size?: number
  childNodes?: ImapPart[]
}

export function extractImapAttachments(structure: ImapPart | null | undefined): ExtractedAttachment[] {
  if (!structure) return []
  const out: ExtractedAttachment[] = []
  function walk(part: ImapPart) {
    const filename = part.dispositionParameters?.filename || part.parameters?.name
    const isAttachment = (part.disposition || '').toLowerCase() === 'attachment'
    if (filename && (isAttachment || (part.size && part.size > 1000))) {
      out.push({
        filename,
        mimeType: part.type && part.subtype ? `${part.type}/${part.subtype}`.toLowerCase() : undefined,
        sizeBytes: part.size,
      })
    }
    if (part.childNodes) for (const c of part.childNodes) walk(c)
  }
  walk(structure)
  return out.slice(0, MAX_ATTACHMENTS)
}
