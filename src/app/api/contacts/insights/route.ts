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

  // Run both in parallel — insights computation and full DB contact list
  const [insights, dbContacts] = await Promise.all([
    computeContactInsights(session.user.id),
    (async () => {
      try {
        return await prisma.contact.findMany({
          where: { userId: session.user!.id },
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

  // Build a map of computed insights keyed by email
  const insightMap = new Map(insights.map(i => [i.email.toLowerCase(), i]))

  // Show ALL Contact DB records (includes manually added + imported contacts).
  // Enrich with relationship metrics where available (i.e. contacts with exchanges).
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
          where: { userId_email: { userId: session.user!.id, email: i.email } },
          create: { userId: session.user!.id, email: i.email, name: i.name, vip: vipSet.has(i.email) },
          update: { vip: vipSet.has(i.email), ...(i.name ? { name: i.name } : {}) },
        }).catch(() => null),
      ),
    )
  } catch (e) {
    safeLog('warn', 'contact-insights-persist', e)
  }

  return NextResponse.json({ insights: merged })
}
