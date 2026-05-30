export interface ExtractedLink { url: string; text: string }
export interface ExtractedAttachment {
  filename: string
  mimeType?: string
  sizeBytes?: number
  attachmentId?: string
}

const MAX_LINKS = 20
const MAX_ATTACHMENTS = 20

// Tracking / unsubscribe links we don't want to surface to the user.
const NOISY_LINK_HOSTS = [
  'click.', 'links.', 'track.', 'tracking.', 'email.', 'mailtrack.',
  'sendgrid.net', 'mailchimp.com', 'list-manage.com', 'mc.us', 'cmail',
  'mailgun.org', 'amazonses.com', 'sparkpostmail.com',
]
const NOISY_LINK_PATHS = ['/track', '/unsubscribe', '/opt-out', '/preferences']

// Personal social-profile links that almost exclusively appear in email
// signatures and are not meaningful action items for the reader.
const SIGNATURE_LINK_PATTERNS: RegExp[] = [
  /^https?:\/\/(www\.)?linkedin\.com\/in\//i,
  /^https?:\/\/wa\.me\//i,
  /^https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/?$/i,
  /^https?:\/\/(www\.)?instagram\.com\/[^/]+\/?$/i,
  /^https?:\/\/(www\.)?facebook\.com\/[^/]+\/?$/i,
  /^https?:\/\/(www\.)?t\.me\//i,
]

function isNoisyLink(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (NOISY_LINK_HOSTS.some(p => host.includes(p))) return true
    if (NOISY_LINK_PATHS.some(p => u.pathname.toLowerCase().includes(p))) return true
    if (SIGNATURE_LINK_PATTERNS.some(re => re.test(url))) return true
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
// signature links, dedupes by URL, caps at MAX_LINKS.
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  if (!html) return []
  // Strip Gmail/Outlook signature wrapper divs so signature links are excluded.
  const cleaned = html.replace(
    /<div[^>]+class="[^"]*(?:gmail_signature|Signature)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    '',
  )
  const out: ExtractedLink[] = []
  const seen = new Set<string>()
  const re = /<a\s+[^>]*?href\s*=\s*("|')([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned)) !== null) {
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

// Plain-text URL extractor. Used for Gmail (plain body) and Outlook.
// Strips from the RFC 3676 email signature delimiter ("-- " on its own line)
// downward so signature links don't appear.
export function extractLinksFromText(text: string): ExtractedLink[] {
  if (!text) return []
  // RFC 3676 signature separator: "-- " or "--" on its own line.
  const sigSepIdx = text.search(/\n--\s*\n/)
  const body = sigSepIdx > 0 ? text.substring(0, sigSepIdx) : text
  const out: ExtractedLink[] = []
  const seen = new Set<string>()
  const re = /https?:\/\/[^\s<>"')\]}]+/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
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

// Walk Gmail payload parts looking for real file attachments.
// Skips inline content (embedded images in body/signature) by checking
// Content-Disposition. Image MIME types with no explicit "attachment"
// disposition are also skipped — they are almost always inline body images.
interface GmailPart {
  filename?: string | null
  mimeType?: string | null
  headers?: Array<{ name: string; value: string }> | null
  body?: { attachmentId?: string | null; size?: number | null } | null
  parts?: GmailPart[] | null
}

export function extractGmailAttachments(payload: GmailPart): ExtractedAttachment[] {
  const out: ExtractedAttachment[] = []
  function walk(part: GmailPart) {
    if (part.filename && part.filename.trim().length > 0 && part.body?.attachmentId) {
      const disposition = (
        part.headers?.find(h => h.name.toLowerCase() === 'content-disposition')?.value ?? ''
      ).toLowerCase()
      const isInline = disposition.startsWith('inline')
      const isExplicitAttachment = disposition.startsWith('attachment')
      const isImageType = (part.mimeType ?? '').toLowerCase().startsWith('image/')
      // Skip inline parts. Also skip image/* with no explicit "attachment" header
      // since those are almost always embedded body/signature images.
      if (!isInline && (isExplicitAttachment || !isImageType)) {
        out.push({
          filename: part.filename,
          mimeType: part.mimeType || undefined,
          sizeBytes: part.body.size ?? undefined,
          attachmentId: part.body.attachmentId,
        })
      }
    }
    if (part.parts) for (const p of part.parts) walk(p)
  }
  walk(payload)
  return out.slice(0, MAX_ATTACHMENTS)
}

// imapflow MessageStructureObject walker. Only includes parts with an
// explicit Content-Disposition of "attachment" — skips inline images.
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
    if (filename && isAttachment) {
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
