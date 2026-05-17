import sanitizeHtmlLib from 'sanitize-html'

/**
 * Strip CR/LF characters from email header values to prevent CRLF injection
 * (header smuggling / Bcc smuggling). Throws if the cleaned value is empty.
 */
export function safeHeaderValue(name: string, value: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${name} header value`)
  const cleaned = value.replace(/[\r\n]+/g, ' ').trim()
  if (!cleaned) throw new Error(`Empty ${name} header value`)
  return cleaned
}

/**
 * Sanitize an HTML email body produced by the rich-text editor or an LLM.
 * Drops <script>, <iframe>, on* event handlers, javascript: URLs, etc.
 * Keeps formatting tags, links, lists, images, blockquotes, tables.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      'a', 'b', 'br', 'blockquote', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4',
      'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'sub',
      'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  })
}

/**
 * Detect whether a body string contains HTML markup. Used to switch between
 * text/plain and text/html in MIME. Looks for real tags, not stray `<`.
 */
export function looksLikeHtml(body: string): boolean {
  return /<\/?(a|p|div|br|span|h[1-6]|ul|ol|li|table|strong|em|b|i|u|blockquote|img)(\s|>|\/)/i.test(body)
}

/**
 * Strip all HTML tags and decode common entities for the text/plain alternative.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
