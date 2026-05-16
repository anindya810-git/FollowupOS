import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildContactsFromMessages } from '@/lib/contacts'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const count = await buildContactsFromMessages(session.user.id)
  return NextResponse.json({ synced: count })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prisma } = await import('@/lib/prisma')
  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    select: { email: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ contacts })
}
