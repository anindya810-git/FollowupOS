import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Cheap list of the user's auto-detected VIP emails, for badging/prioritising
// items elsewhere without recomputing insights.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let emails: string[] = []
  try {
    const rows = await prisma.contact.findMany({
      where: { userId: session.user.id, vip: true },
      select: { email: true },
    })
    emails = rows.map(r => r.email.toLowerCase())
  } catch {
    emails = []
  }
  return NextResponse.json({ emails })
}
