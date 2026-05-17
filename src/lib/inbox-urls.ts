type ProviderInput = {
  provider: string
  emailAddress?: string | null
  webmailBaseUrl?: string | null
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

export function getThreadUrl(account: ProviderInput, providerThreadId?: string | null): string | null {
  if (account.provider === 'gmail' && providerThreadId) {
    return `https://mail.google.com/mail/u/0/#all/${providerThreadId}`
  }
  return getInboxUrl(account)
}
