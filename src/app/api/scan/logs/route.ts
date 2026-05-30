import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Never cache — the logs page polls this for live scan diagnostics.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Map account ids to email addresses for display.
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    select: { id: true, emailAddress: true, provider: true },
  })
  const accountMap = new Map(accounts.map(a => [a.id, a]))

  const jobs = await prisma.scanJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      emailAccountId: true,
      status: true,
      threadsFound: true,
      threadsProcessed: true,
      actionItemsCreated: true,
      errorMessage: true,
      debugLog: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    jobs: jobs.map(j => {
      const acct = accountMap.get(j.emailAccountId)
      return {
        ...j,
        accountEmail: acct?.emailAddress ?? 'Unknown inbox',
        accountProvider: acct?.provider ?? 'unknown',
      }
    }),
  })
}
