import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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
    },
    orderBy: { createdAt: 'asc' },
  })

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
