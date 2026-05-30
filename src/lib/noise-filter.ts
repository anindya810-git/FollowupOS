/**
 * Shared noise-filtering logic for all email providers.
 * Returns true when a message should be silently skipped — no AI call, no action item.
 */

// Sender local-part substrings that are virtually always automated/bulk mail.
// Keep this list tight — broad terms like 'alert', 'notification', 'update'
// block legitimate action emails (billing overdue, hiring shortlists, fraud
// warnings) so they are intentionally excluded. Let the AI decide those.
export const NOISE_SENDER_LOCAL = [
  'no-reply', 'noreply', 'do-not-reply', 'donotreply',
  'newsletter', 'newsletters',
  'marketing', 'promotions', 'promo',
  'digest', 'weekly', 'daily', 'monthly',
  'mailer', 'mailing',
  'automailer', 'autoresponder', 'auto-responder',
  'bounces', 'bounce',
  'unsubscribe',
  'subscriptions', 'subscribe',
  'campaigns', 'campaign',
  'offers', 'deals', 'discounts',
  'receipts', 'receipt',
  'security-noreply', 'account-security',
  'robot', 'bot',
]

// Full sender domains that exclusively produce noise.
// Only include domains where EVERY email is noise — if even one email type
// from that domain can require action, do NOT include it here.
export const NOISE_SENDER_DOMAINS = [
  // Social media notifications
  'linkedin.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'facebookmail.com',
  'instagram.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'youtube.com',
  'snapchat.com',
  'tumblr.com',
  'threads.net',
  'bsky.social',
  'discord.com',
  'slack.com',         // Slack notification emails (not direct messages)
  'medium.com',        // digest emails
  'substack.com',      // newsletter platform
  'beehiiv.com',       // newsletter platform
  'convertkit.com',
  'mailerlite.com',
  'klaviyo.com',
  // E-commerce transactional noise
  'amazon.com',
  'amazon.co.uk',
  'amazon.in',
  'ebay.com',
  'etsy.com',
  'shopify.com',
  // Delivery/tracking
  'fedex.com',
  'ups.com',
  'usps.com',
  'dhl.com',
]

// Subject-line substrings that strongly indicate noise
export const NOISE_SUBJECT_PATTERNS = [
  'unsubscribe',
  'newsletter',
  'your weekly',
  'your daily',
  'your monthly',
  'weekly digest',
  'daily digest',
  'monthly digest',
  'weekly roundup',
  'weekly summary',
  'top stories',
  'trending now',
  'you have a new notification',
  'new connection',
  'people you may know',
  'accepted your invitation',
  'viewed your profile',
  'liked your post',
  'commented on your',
  'mentioned you in',
  'reacted to your',
  'shared your post',
  'new follower',
  'started following',
  'order confirmation',
  'order shipped',
  'shipment tracking',
  'your receipt',
  'payment received',
  'transaction complete',
  'verify your email',
  'confirm your email',
  'confirm your account',
  'one-time password',
  'one-time code',
  'your otp',
  '% off',
  'sale ends',
  'limited time offer',
  'exclusive offer',
  'special offer',
  'free shipping',
  'flash sale',
]

/**
 * Returns true when the sender address alone marks the message as noise.
 * Checks: local-part substrings AND known noise domains.
 */
export function isNoisySender(email: string): boolean {
  const lower = email.toLowerCase().trim()
  const atIndex = lower.indexOf('@')
  if (atIndex === -1) return false

  const localPart = lower.slice(0, atIndex)
  const domain = lower.slice(atIndex + 1)

  // Check full domain match
  if (NOISE_SENDER_DOMAINS.includes(domain)) return true

  // Check subdomain match (e.g. mail.linkedin.com, em.facebook.com)
  if (NOISE_SENDER_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true

  // Check local-part patterns
  if (NOISE_SENDER_LOCAL.some(p => localPart.includes(p))) return true

  return false
}

/**
 * Returns true when the subject line indicates noise.
 */
export function isNoisySubject(subject: string): boolean {
  const lower = subject.toLowerCase()
  return NOISE_SUBJECT_PATTERNS.some(p => lower.includes(p))
}

/**
 * Combined check: noisy if either sender or subject matches noise patterns.
 */
export function isNoisyEmail(senderEmail: string, subject: string): boolean {
  return isNoisySender(senderEmail) || isNoisySubject(subject)
}
