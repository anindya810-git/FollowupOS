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

  const [insights, dbContacts] = await Promise.all([
    computeContactInsights(session.user.id),
    prisma.contact.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        designation: true,
        company: true,
        city: true,
        notes: true,
        linkedinUrl: true,
        aiEnriched: true,
        vip: true,
      },
    }),
  ])

  // Merge computed insights with stored profile fields
  const contactMap = new Map(dbContacts.map(c => [c.email.toLowerCase(), c]))
  const merged = insights.map(i => {
    const stored = contactMap.get(i.email.toLowerCase())
    return {
      ...i,
      id: stored?.id ?? null,
      phone: stored?.phone ?? null,
      designation: stored?.designation ?? null,
      company: stored?.company ?? null,
      city: stored?.city ?? null,
      notes: stored?.notes ?? null,
      linkedinUrl: stored?.linkedinUrl ?? null,
      aiEnriched: stored?.aiEnriched ?? false,
      // Prefer stored name if set; fall back to insight name from email headers
      name: stored?.name || i.name,
    }
  })

  // Persist VIP flag and upsert top 200 contacts — best-effort, never fail the request.
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
