import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch recent messages from this contact for context
  const messages = await prisma.emailMessage.findMany({
    where: { userId: session.user.id, senderEmail: { equals: contact.email, mode: 'insensitive' } },
    select: { id: true, snippet: true, bodyExcerpt: true, sentAt: true, emailThreadId: true },
    orderBy: { sentAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({ contact, messages })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const allowed = ['name', 'designation', 'company', 'phone', 'city', 'notes', 'linkedinUrl'] as const
  const updates: Record<string, string | null> = {}
  for (const field of allowed) {
    if (field in body) {
      updates[field] = typeof body[field] === 'string' ? body[field].trim() || null : null
    }
  }

  const contact = await prisma.contact.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: updates,
  })

  if (contact.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.contact.deleteMany({
    where: { id: params.id, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
