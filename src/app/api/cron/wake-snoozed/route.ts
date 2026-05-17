import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'

async function runWakeSnoozed() {
  // snoozedUntil is stored as 'YYYY-MM-DD' (local-date-ish — see schedule
  // route). Compare lexicographically against today's date in UTC; if the
  // user's timezone differs, a wake-up may be off by up to one day. Close
  // enough until snoozedUntil becomes a real timestamp.
  const today = new Date().toISOString().split('T')[0]

  const result = await prisma.actionItem.updateMany({
    where: {
      status: 'snoozed',
      snoozedUntil: { lte: today },
    },
    data: {
      status: 'open',
      snoozedUntil: null,
    },
  })

  return { woke: result.count }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runWakeSnoozed())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runWakeSnoozed())
}
