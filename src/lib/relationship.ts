import { prisma } from './prisma'

export interface ContactInsight {
  email: string
  name: string | null
  inboundCount: number       // messages they've sent you
  exchangeCount: number      // times you replied to them
  unrepliedCount: number     // their messages you never answered
  lastInboundAt: string | null
  typicalReplyHours: number | null  // your usual time-to-reply
  currentGapHours: number | null    // how long their latest message has waited
  cooling: boolean           // gap is well beyond your norm
  ghosting: boolean          // you repeatedly leave them unanswered
  vip: boolean               // engage often + reply fast
  vipScore: number
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

interface Acc {
  name: string | null
  inboundCount: number
  deltasHours: number[]      // your reply times to their messages
  unrepliedCount: number
  lastInboundAt: number | null         // ms
  lastUnrepliedInboundAt: number | null // ms
}

/**
 * Compute per-contact relationship intelligence from stored messages:
 * reply speed, current wait, "cooling", "ghosting", and VIP auto-detection.
 * Pure read — pairs each inbound message with the user's next reply in the
 * same thread to estimate typical reply time.
 */
export async function computeContactInsights(userId: string): Promise<ContactInsight[]> {
  const messages = await prisma.emailMessage.findMany({
    where: { userId, sentAt: { not: null } },
    select: { emailThreadId: true, senderEmail: true, senderName: true, isFromUser: true, sentAt: true },
    orderBy: [{ emailThreadId: 'asc' }, { sentAt: 'asc' }],
    take: 8000,
  })

  const byContact = new Map<string, Acc>()
  const get = (email: string): Acc => {
    let a = byContact.get(email)
    if (!a) {
      a = { name: null, inboundCount: 0, deltasHours: [], unrepliedCount: 0, lastInboundAt: null, lastUnrepliedInboundAt: null }
      byContact.set(email, a)
    }
    return a
  }

  // Walk thread by thread (messages are ordered by thread then time).
  let currentThread: string | null = null
  let pending: Array<{ email: string; t: number }> = []
  const flushUnreplied = () => {
    for (const p of pending) {
      const a = get(p.email)
      a.unrepliedCount++
      a.lastUnrepliedInboundAt = Math.max(a.lastUnrepliedInboundAt ?? 0, p.t)
    }
    pending = []
  }

  for (const m of messages) {
    if (m.emailThreadId !== currentThread) {
      flushUnreplied()
      currentThread = m.emailThreadId
    }
    const t = m.sentAt ? m.sentAt.getTime() : null
    if (t === null) continue
    if (m.isFromUser) {
      // The user replied — resolve all pending inbound messages.
      for (const p of pending) {
        const a = get(p.email)
        const hrs = (t - p.t) / 3_600_000
        if (hrs >= 0) a.deltasHours.push(hrs)
      }
      pending = []
    } else {
      const email = (m.senderEmail || '').trim().toLowerCase()
      if (!email.includes('@')) continue
      const a = get(email)
      a.inboundCount++
      if (m.senderName && !a.name) a.name = m.senderName
      a.lastInboundAt = Math.max(a.lastInboundAt ?? 0, t)
      pending.push({ email, t })
    }
  }
  flushUnreplied()

  const now = Date.now()
  const insights: ContactInsight[] = []
  for (const [email, a] of byContact) {
    if (a.inboundCount === 0) continue
    const exchangeCount = a.deltasHours.length
    const typicalReplyHours = exchangeCount >= 2 ? Math.round(median(a.deltasHours)) : null
    const currentGapHours = a.lastUnrepliedInboundAt
      ? Math.round((now - a.lastUnrepliedInboundAt) / 3_600_000)
      : null

    // Cooling: an unanswered message has waited well beyond your usual reply
    // time (at least 2× your norm, and at least ~2 days).
    const cooling = !!(
      typicalReplyHours !== null &&
      currentGapHours !== null &&
      currentGapHours > Math.max(typicalReplyHours * 2, 48)
    )

    // Ghosting: you leave most of their messages unanswered (needs a few data points).
    const ghosting = a.inboundCount >= 3 && a.unrepliedCount / a.inboundCount >= 0.6

    // VIP: you engage often and reply fast — they clearly matter.
    const fastReplies = typicalReplyHours !== null && typicalReplyHours <= 24
    const vip = exchangeCount >= 3 && fastReplies
    const vipScore =
      exchangeCount * 3 +
      (fastReplies ? 8 : 0) +
      Math.min(a.inboundCount, 20)

    insights.push({
      email,
      name: a.name,
      inboundCount: a.inboundCount,
      exchangeCount,
      unrepliedCount: a.unrepliedCount,
      lastInboundAt: a.lastInboundAt ? new Date(a.lastInboundAt).toISOString() : null,
      typicalReplyHours,
      currentGapHours,
      cooling,
      ghosting,
      vip,
      vipScore,
    })
  }

  // Most-relevant first: VIPs and most-engaged at the top.
  insights.sort((x, y) => y.vipScore - x.vipScore)
  return insights
}

/**
 * Recompute insights and persist the VIP flag onto Contact rows so VIP badges
 * and prioritisation work everywhere without the user opening the Contacts
 * page. Best-effort — never throws (called from the scanner on completion).
 */
export async function refreshVipFlags(userId: string): Promise<void> {
  try {
    const insights = await computeContactInsights(userId)
    const vipSet = new Set(insights.filter(i => i.vip).map(i => i.email))
    await Promise.all(
      insights.slice(0, 200).map(i =>
        prisma.contact.upsert({
          where: { userId_email: { userId, email: i.email } },
          create: { userId, email: i.email, name: i.name, vip: vipSet.has(i.email) },
          update: { vip: vipSet.has(i.email), ...(i.name ? { name: i.name } : {}) },
        }).catch(() => null),
      ),
    )
  } catch {
    // best-effort
  }
}
