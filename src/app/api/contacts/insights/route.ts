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

  const insights = await computeContactInsights(session.user.id)

  // Persist the VIP flag so other surfaces (queue badges, prioritisation) can
  // use it cheaply without recomputing. Best-effort — never fail the request.
  try {
    const vipEmails = insights.filter(i => i.vip).map(i => i.email)
    const vipSet = new Set(vipEmails)
    // Upsert names + vip for everyone we have insight on.
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

  return NextResponse.json({ insights })
}
