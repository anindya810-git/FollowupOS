import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Never cache — scan status/progress must always be read fresh so the
// settings page polling reflects live scan state.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      emailAddress: true,
      connectedStatus: true,
      lastSyncedAt: true,
      initialScanCompleted: true,
      webmailBaseUrl: true,
      webmailSearchUrlTemplate: true,
      noiseFilterLevel: true,
      scanInstructions: true,
      autoScanIntervalMinutes: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Callers that only need the inbox list (e.g. the contacts import modal and
  // inbox pickers) pass ?basic=1 to skip the per-account scan-job lookup —
  // that N+1 query is the slow part and is irrelevant outside Settings.
  if (req.nextUrl.searchParams.get('basic') === '1') {
    return NextResponse.json({ accounts })
  }

  const accountsWithScan = await Promise.all(accounts.map(async (account) => {
    const lastScan = await prisma.scanJob.findFirst({
      where: { emailAccountId: account.id },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        threadsFound: true,
        threadsProcessed: true,
        actionItemsCreated: true,
        errorMessage: true,
        createdAt: true,
      },
    })
    return { ...account, lastScan }
  }))

  return NextResponse.json({ accounts: accountsWithScan })
}
