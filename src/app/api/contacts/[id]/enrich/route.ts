import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAiConfig, extractContactProfile } from '@/lib/ai'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const contact = await prisma.contact.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const config = await resolveAiConfig(session.user.id)
  if (!config) return NextResponse.json({ error: 'No AI provider configured' }, { status: 400 })

  const messages = await prisma.emailMessage.findMany({
    where: { userId: session.user.id, senderEmail: { equals: contact.email, mode: 'insensitive' } },
    select: { bodyExcerpt: true, snippet: true, senderName: true, sentAt: true },
    orderBy: { sentAt: 'desc' },
    take: 5,
  })

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No emails found for this contact to analyse' }, { status: 400 })
  }

  const emailContent = messages
    .map((m, i) => `[Email ${i + 1}]\n${m.bodyExcerpt || m.snippet || '(no content)'}`)
    .join('\n\n---\n\n')

  const profile = await extractContactProfile(emailContent, config)
  if (!profile) return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })

  // Only fill empty fields — don't overwrite what the user has already set
  const updates: Record<string, string | null | boolean> = { aiEnriched: true }
  if (profile.name && !contact.name) updates.name = profile.name
  if (profile.designation && !contact.designation) updates.designation = profile.designation
  if (profile.company && !contact.company) updates.company = profile.company
  if (profile.phone && !contact.phone) updates.phone = profile.phone
  if (profile.city && !contact.city) updates.city = profile.city
  if (profile.linkedinUrl && !contact.linkedinUrl) updates.linkedinUrl = profile.linkedinUrl

  await prisma.contact.update({
    where: { id },
    data: updates,
  })

  const updated = await prisma.contact.findUnique({ where: { id } })
  return NextResponse.json({ contact: updated, extracted: profile })
}
