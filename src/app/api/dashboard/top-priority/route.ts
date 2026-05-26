import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // priority is stored as a string ("high"|"medium"|"low"). Alphabetical
  // sort puts "high" first only by accident; sort in app code for correctness.
  const items = await prisma.actionItem.findMany({
    where: {
      userId: session.user.id,
      status: 'open',
      category: { not: 'no_action_needed' },
    },
    orderBy: { lastActivityAt: 'desc' },
    take: 50,
    include: {
      emailThread: {
        select: {
          subject: true,
          providerUrl: true,
          lastMessageAt: true,
          participants: true,
          // Last inbound message so ActionCard can show sender name/email
          // and populate the ignore-sender/ignore-domain dropdown correctly.
          messages: {
            where: { isFromUser: false },
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: { senderEmail: true, senderName: true, isFromUser: true, linksJson: true, attachmentsJson: true },
          },
        },
      },
    },
  })

  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  items.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3))

  return NextResponse.json({ items: items.slice(0, 10) })
}
