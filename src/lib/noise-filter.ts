/**
 * Level-aware noise filtering for all email providers.
 *
 * Levels 1–5 control how aggressively emails are discarded before reaching AI:
 *   1 = Minimal  — only SPAM/TRASH and pure no-reply addresses
 *   2 = Light    — + social media, newsletters, marketing senders/domains
 *   3 = Balanced — + e-commerce, delivery, bulk-mail platforms (default)
 *   4 = Strict   — + bank alerts, transaction notifications, system mailers
 *   5 = Maximum  — + Gmail Updates/Promotions/Social labels, all automated patterns
 */

// ─── Gmail label sets (cumulative) ───────────────────────────────────────────

const NOISE_LABELS_BASE = ['SPAM', 'TRASH']
const NOISE_LABELS_L5 = [
  ...NOISE_LABELS_BASE,
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'CATEGORY_FORUMS',
  'CATEGORY_UPDATES',
]
const NOISE_LABELS_L2 = [
  ...NOISE_LABELS_BASE,
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'CATEGORY_FORUMS',
]

function getNoiseLabels(level: number): string[] {
  if (level >= 5) return NOISE_LABELS_L5
  if (level >= 2) return NOISE_LABELS_L2
  return NOISE_LABELS_BASE
}

// ─── Sender local-part patterns (additive per tier) ──────────────────────────

// Level 1 — only senders that can never be a real human
const LOCAL_L1 = [
  'no-reply', 'noreply', 'do-not-reply', 'donotreply',
  'unsubscribe',
  'robot', 'bot',
]
// Level 2 adds: bulk/marketing infrastructure
const LOCAL_L2 = [
  'newsletter', 'newsletters',
  'marketing', 'promotions', 'promo',
  'mailer', 'mailing',
  'automailer', 'autoresponder', 'auto-responder',
  'bounces', 'bounce',
  'subscriptions', 'subscribe',
  'campaigns', 'campaign',
]
// Level 3 adds: deal/receipt/digest/security senders
const LOCAL_L3 = [
  'offers', 'deals', 'discounts',
  'receipts', 'receipt',
  'digest', 'weekly', 'daily', 'monthly',
  'security-noreply', 'account-security',
]
// Level 4 adds: alert/notification/automated senders (blocks many bank/cloud emails)
const LOCAL_L4 = [
  'alerts', 'alert',
  'notifications', 'notification',
  'updates', 'update',
  'system', 'automated',
]
// Level 5 adds: confirmation and any remaining automated patterns
const LOCAL_L5 = [
  'confirm', 'confirmation',
  'info', 'support',   // very broad — only block at max level
]

function getSenderLocalPatterns(level: number): string[] {
  const patterns = [...LOCAL_L1]
  if (level >= 2) patterns.push(...LOCAL_L2)
  if (level >= 3) patterns.push(...LOCAL_L3)
  if (level >= 4) patterns.push(...LOCAL_L4)
  if (level >= 5) patterns.push(...LOCAL_L5)
  return patterns
}

// ─── Sender domains (additive per tier) ──────────────────────────────────────

// Level 1 — none blocked by domain alone
const DOMAINS_L1: string[] = []

// Level 2 — social media (never action-needed)
const DOMAINS_L2 = [
  'linkedin.com',
  'twitter.com', 'x.com',
  'facebook.com', 'facebookmail.com',
  'instagram.com', 'tiktok.com', 'pinterest.com',
  'reddit.com', 'youtube.com', 'snapchat.com',
  'tumblr.com', 'threads.net', 'bsky.social',
  'discord.com',
  'slack.com',         // Slack notification emails (not DMs)
  'medium.com',
]

// Level 3 — newsletter platforms + delivery + e-commerce
const DOMAINS_L3 = [
  'substack.com', 'beehiiv.com', 'convertkit.com', 'mailerlite.com', 'klaviyo.com',
  'amazon.com', 'amazon.co.uk', 'amazon.in',
  'ebay.com', 'etsy.com', 'shopify.com',
  'fedex.com', 'ups.com', 'usps.com', 'dhl.com',
]

// Level 4 — payment processors + broad-net cloud platforms
const DOMAINS_L4 = [
  'paypal.com', 'stripe.com', 'netsuite.com',
  'google.com', 'googlemail.com',   // blocks GCP billing at this level
]

function getNoiseDomains(level: number): string[] {
  const domains = [...DOMAINS_L1]
  if (level >= 2) domains.push(...DOMAINS_L2)
  if (level >= 3) domains.push(...DOMAINS_L3)
  if (level >= 4) domains.push(...DOMAINS_L4)
  return domains
}

// ─── Subject patterns (additive per tier) ────────────────────────────────────

const SUBJECTS_L1 = [
  'one-time password', 'one-time code', 'your otp',
]

const SUBJECTS_L2 = [
  'unsubscribe',
  'you have a new notification',
  'new connection', 'people you may know',
  'accepted your invitation', 'viewed your profile',
  'liked your post', 'commented on your', 'mentioned you in',
  'reacted to your', 'shared your post',
  'new follower', 'started following',
  'verify your email', 'confirm your email', 'confirm your account',
  'security code',
]

const SUBJECTS_L3 = [
  'newsletter',
  'your weekly', 'your daily', 'your monthly',
  'weekly digest', 'daily digest', 'monthly digest',
  'weekly roundup', 'weekly summary',
  'top stories', 'trending now',
  'order confirmation', 'order shipped', 'shipment tracking', 'your receipt',
  '% off', 'sale ends', 'limited time offer', 'exclusive offer',
  'special offer', 'free shipping', 'flash sale',
]

const SUBJECTS_L4 = [
  'payment received', 'transaction complete', 'invoice #',
]

function getNoiseSubjectPatterns(level: number): string[] {
  const patterns = [...SUBJECTS_L1]
  if (level >= 2) patterns.push(...SUBJECTS_L2)
  if (level >= 3) patterns.push(...SUBJECTS_L3)
  if (level >= 4) patterns.push(...SUBJECTS_L4)
  return patterns
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const DEFAULT_NOISE_LEVEL = 3

export const NOISE_LEVEL_LABELS: Record<number, { name: string; description: string }> = {
  1: {
    name: 'Minimal',
    description: 'Only SPAM/Trash filtered. Bank alerts, cloud billing, hiring emails, notifications — all reach AI.',
  },
  2: {
    name: 'Light',
    description: 'Also blocks social media (LinkedIn, Twitter) and newsletter platforms. Bank and cloud alerts still reach AI.',
  },
  3: {
    name: 'Balanced',
    description: 'Also blocks e-commerce, delivery services, and bulk-mail platforms. Bank alerts and cloud billing still reach AI.',
  },
  4: {
    name: 'Strict',
    description: 'Also blocks alert/notification senders and Google services. May miss billing overdue or hiring emails.',
  },
  5: {
    name: 'Maximum',
    description: 'Blocks Gmail Updates/Promotions/Social tabs plus all automated sender patterns. Only clear human emails reach AI.',
  },
}

export function isNoisyGmailLabels(labels: string[], level = DEFAULT_NOISE_LEVEL): boolean {
  const noiseLabels = getNoiseLabels(level)
  return labels.some(l => noiseLabels.includes(l))
}

export function isNoisySender(email: string, level = DEFAULT_NOISE_LEVEL): boolean {
  const lower = email.toLowerCase().trim()
  const atIndex = lower.indexOf('@')
  if (atIndex === -1) return false

  const localPart = lower.slice(0, atIndex)
  const domain = lower.slice(atIndex + 1)

  const domains = getNoiseDomains(level)
  if (domains.includes(domain)) return true
  if (domains.some(d => domain === d || domain.endsWith('.' + d))) return true

  const localPatterns = getSenderLocalPatterns(level)
  if (localPatterns.some(p => localPart.includes(p))) return true

  return false
}

export function isNoisySubject(subject: string, level = DEFAULT_NOISE_LEVEL): boolean {
  const lower = subject.toLowerCase()
  return getNoiseSubjectPatterns(level).some(p => lower.includes(p))
}

export function isNoisyEmail(senderEmail: string, subject: string, level = DEFAULT_NOISE_LEVEL): boolean {
  return isNoisySender(senderEmail, level) || isNoisySubject(subject, level)
}
