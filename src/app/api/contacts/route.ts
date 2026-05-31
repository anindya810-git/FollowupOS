import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildContactsFromMessages } from '@/lib/contacts'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)

  // Manual contact creation — body must include email
  if (body?.email) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null)
    const contact = await prisma.contact.upsert({
      where: { userId_email: { userId: session.user.id, email } },
      create: {
        userId: session.user.id,
        email,
        name: str(body.name),
        designation: str(body.designation),
        company: str(body.company),
        phone: str(body.phone),
        city: str(body.city),
        notes: str(body.notes),
        linkedinUrl: str(body.linkedinUrl),
      },
      update: {},  // don't overwrite existing data on duplicate
    })
    return NextResponse.json({ contact })
  }

  // Import senders from stored messages — optionally filtered to specific inboxes
  try {
    const inboxIds = Array.isArray(body?.inbox_ids) ? (body.inbox_ids as string[]) : undefined
    const count = await buildContactsFromMessages(session.user.id, inboxIds)
    return NextResponse.json({ synced: count })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    select: { email: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ contacts })
}
