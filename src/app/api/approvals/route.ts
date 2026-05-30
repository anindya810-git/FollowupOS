import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Pending auto-follow-up drafts awaiting the user's one-tap approval.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let approvals: Array<Record<string, unknown>> = []
  try {
    const rows = await prisma.scheduledMessage.findMany({
      where: { userId: session.user.id, status: 'awaiting_approval' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    // Attach a little action-item context (title) for display.
    const itemIds = rows.map(r => r.actionItemId).filter((x): x is string => !!x)
    const items = itemIds.length
      ? await prisma.actionItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, title: true, ownerName: true, category: true },
        })
      : []
    const itemMap = new Map(items.map(i => [i.id, i]))
    approvals = rows.map(r => ({
      id: r.id,
      toEmail: r.toEmail,
      subject: r.subject,
      contentHtml: r.contentHtml,
      createdAt: r.createdAt,
      actionItemId: r.actionItemId,
      item: r.actionItemId ? itemMap.get(r.actionItemId) ?? null : null,
    }))
  } catch {
    approvals = []
  }

  return NextResponse.json({ approvals })
}
