import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeContactInsights } from '@/lib/relationship'
import { safeLog } from '@/lib/safe-log'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Run insights computation and DB contact list in parallel
  const [insights, dbContacts] = await Promise.all([
    computeContactInsights(userId),
    (async () => {
      try {
        return await prisma.contact.findMany({
          where: { userId },
          select: {
            id: true, email: true, name: true, vip: true,
            phone: true, designation: true, company: true,
            city: true, notes: true, linkedinUrl: true, aiEnriched: true,
          },
        })
      } catch {
        // New columns may not exist — fall back to base fields
        try {
          return await prisma.contact.findMany({
            where: { userId: session.user!.id },
            select: { id: true, email: true, name: true, vip: true },
          })
        } catch { return [] }
      }
    })(),
  ])

  // Fetch which inbox(es) each contact has been seen in via a single SQL query.
  // Returns distinct (senderEmail, emailAccountId, emailAddress, provider) tuples.
  type InboxRow = { senderEmail: string; emailAccountId: string; emailAddress: string; provider: string }
  let senderInboxRows: InboxRow[] = []
  try {
    senderInboxRows = await prisma.$queryRaw<InboxRow[]>`
      SELECT DISTINCT
        LOWER(em."senderEmail") AS "senderEmail",
        et."emailAccountId",
        ea."emailAddress",
        ea.provider
      FROM "EmailMessage" em
      JOIN "EmailThread" et ON em."emailThreadId" = et.id
      JOIN "EmailAccount" ea ON et."emailAccountId" = ea.id
      WHERE em."userId" = ${userId}
        AND em."isFromUser" = false
        AND em."senderEmail" IS NOT NULL
    `
  } catch { /* ignore — inbox data is supplemental */ }

  // Build map: senderEmail → inbox list
  const inboxMap = new Map<string, Array<{ id: string; emailAddress: string; provider: string }>>()
  for (const row of senderInboxRows) {
    const key = row.senderEmail.toLowerCase()
    if (!inboxMap.has(key)) inboxMap.set(key, [])
    const list = inboxMap.get(key)!
    if (!list.find(i => i.id === row.emailAccountId)) {
      list.push({ id: row.emailAccountId, emailAddress: row.emailAddress, provider: row.provider })
    }
  }

  // Build a map of computed insights keyed by email
  const insightMap = new Map(insights.map(i => [i.email.toLowerCase(), i]))

  // Show ALL Contact DB records (includes manually added + imported contacts).
  // Enrich with relationship metrics and inbox origin where available.
  const merged = dbContacts.map(c => {
    const insight = insightMap.get(c.email.toLowerCase())
    return {
      id: c.id,
      email: c.email,
      name: c.name || insight?.name || null,
      phone: (c as { phone?: string | null }).phone ?? null,
      designation: (c as { designation?: string | null }).designation ?? null,
      company: (c as { company?: string | null }).company ?? null,
      city: (c as { city?: string | null }).city ?? null,
      notes: (c as { notes?: string | null }).notes ?? null,
      linkedinUrl: (c as { linkedinUrl?: string | null }).linkedinUrl ?? null,
      aiEnriched: (c as { aiEnriched?: boolean }).aiEnriched ?? false,
      vip: c.vip,
      // Which connected inbox(es) this contact has sent email to
      inboxes: inboxMap.get(c.email.toLowerCase()) ?? [],
      // Relationship metrics — zero/null for contacts with no exchange history
      inboundCount: insight?.inboundCount ?? 0,
      exchangeCount: insight?.exchangeCount ?? 0,
      unrepliedCount: insight?.unrepliedCount ?? 0,
      lastInboundAt: insight?.lastInboundAt ?? null,
      typicalReplyHours: insight?.typicalReplyHours ?? null,
      currentGapHours: insight?.currentGapHours ?? null,
      cooling: insight?.cooling ?? false,
      ghosting: insight?.ghosting ?? false,
      vipScore: insight?.vipScore ?? 0,
    }
  })

  // Sort: VIPs and most-engaged first, then alphabetically
  merged.sort((a, b) => {
    if (b.vipScore !== a.vipScore) return b.vipScore - a.vipScore
    if (b.exchangeCount !== a.exchangeCount) return b.exchangeCount - a.exchangeCount
    return (a.name || a.email).localeCompare(b.name || b.email)
  })

  // Persist VIP flag — best-effort, never fail the request
  try {
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
  } catch (e) {
    safeLog('warn', 'contact-insights-persist', e)
  }

  return NextResponse.json({ insights: merged })
}
