import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { account_id } = body

  if (!account_id) {
    return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
  }

  await prisma.emailAccount.updateMany({
    where: {
      id: account_id,
      userId: session.user.id,
      provider: { in: ['zoho', 'apple', 'imap'] },
    },
    data: { connectedStatus: 'disconnected' },
  })

  return NextResponse.json({ success: true })
}
