import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let account_id: string | undefined
  try {
    const body = await request.json()
    account_id = body.account_id
  } catch {
    // No body or invalid JSON — backwards compat: disconnect all Gmail
  }

  if (account_id) {
    await prisma.emailAccount.updateMany({
      where: {
        id: account_id,
        userId: session.user.id,
        provider: 'gmail',
      },
      data: { connectedStatus: 'disconnected' },
    })
  } else {
    // Backwards compat: disconnect all Gmail accounts
    await prisma.emailAccount.updateMany({
      where: { userId: session.user.id, provider: 'gmail' },
      data: { connectedStatus: 'disconnected' },
    })
  }

  return NextResponse.json({ success: true })
}
