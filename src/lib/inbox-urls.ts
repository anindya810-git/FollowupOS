type ProviderInput = {
  provider: string
  emailAddress?: string | null
  webmailBaseUrl?: string | null
  webmailSearchUrlTemplate?: string | null
}

function normaliseBase(url: string): string {
  return url.replace(/\/+$/, '')
}

export function getInboxUrl(account: ProviderInput): string | null {
  switch (account.provider) {
    case 'gmail':
      return 'https://mail.google.com/mail/u/0/#inbox'
    case 'outlook': {
      const isPersonal = account.emailAddress
        ? /@(outlook|hotmail|live|msn)\.[a-z]+$/i.test(account.emailAddress)
        : false
      return isPersonal
        ? 'https://outlook.live.com/mail/0/inbox'
        : 'https://outlook.office.com/mail/inbox'
    }
    case 'zoho':
      return account.webmailBaseUrl ? normaliseBase(account.webmailBaseUrl) : 'https://mail.zoho.com'
    case 'apple':
      return account.webmailBaseUrl ? normaliseBase(account.webmailBaseUrl) : 'https://www.icloud.com/mail'
    case 'imap':
      return account.webmailBaseUrl ? normaliseBase(account.webmailBaseUrl) : null
    default:
      return account.webmailBaseUrl ? normaliseBase(account.webmailBaseUrl) : null
  }
}

function applySearchTemplate(template: string, query: string): string {
  const encoded = encodeURIComponent(query)
  if (template.includes('{q}')) return template.replace(/\{q\}/g, encoded)
  if (template.includes('{query}')) return template.replace(/\{query\}/g, encoded)
  return template + encoded
}

export function getThreadUrl(
  account: ProviderInput,
  providerThreadId?: string | null,
  subject?: string | null
): string | null {
  if (account.provider === 'gmail' && providerThreadId) {
    return `https://mail.google.com/mail/u/0/#all/${providerThreadId}`
  }
  if (account.webmailSearchUrlTemplate && subject) {
    return applySearchTemplate(account.webmailSearchUrlTemplate, subject)
  }
  return getInboxUrl(account)
}

export function defaultSearchTemplateFor(provider: string): string | null {
  if (provider === 'zoho') return 'https://mail.zoho.com/zm/#search/nq={q}'
  return null
}
