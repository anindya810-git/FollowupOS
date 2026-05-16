import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  const [replyNeeded, followupDue, waitingOnThem, overdueCommitments, highPriority, snoozed] = await Promise.all([
    prisma.actionItem.count({ where: { userId, status: 'open', category: 'reply_needed' } }),
    prisma.actionItem.count({ where: { userId, status: 'open', category: 'followup_due' } }),
    prisma.actionItem.count({ where: { userId, status: 'open', category: 'waiting_on_them' } }),
    prisma.actionItem.count({ where: { userId, status: 'open', category: 'overdue_commitment' } }),
    prisma.actionItem.count({ where: { userId, status: 'open', priority: 'high' } }),
    prisma.actionItem.count({ where: { userId, status: 'snoozed', snoozedUntil: { lte: today } } }),
  ])

  return NextResponse.json({
    reply_needed: replyNeeded,
    followup_due: followupDue,
    waiting_on_them: waitingOnThem,
    overdue_commitments: overdueCommitments,
    high_priority: highPriority,
    snoozed,
  })
}
