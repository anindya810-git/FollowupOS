import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, customImage: true, timezone: true, createdAt: true, designation: true, company: true, phone: true, socialLinkedin: true, socialTwitter: true, socialInstagram: true, socialFacebook: true, socialSnapchat: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { customImage, ...rest } = user
  return NextResponse.json({ ...rest, image: customImage ?? user.image })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { name?: unknown; timezone?: unknown; designation?: unknown; company?: unknown; phone?: unknown; socialLinkedin?: unknown; socialTwitter?: unknown; socialInstagram?: unknown; socialFacebook?: unknown; socialSnapchat?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    data.name = body.name.trim().slice(0, 80) || null
  }
  if (typeof body.timezone === 'string') {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: body.timezone })
      data.timezone = body.timezone
    } catch {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
    }
  }
  if (typeof body.designation === 'string') {
    data.designation = body.designation.trim().slice(0, 100) || null
  }
  if (typeof body.company === 'string') {
    data.company = body.company.trim().slice(0, 100) || null
  }
  if (typeof body.phone === 'string') {
    data.phone = body.phone.trim().slice(0, 30) || null
  }
  if (typeof body.socialLinkedin === 'string') data.socialLinkedin = body.socialLinkedin.trim().slice(0, 200) || null
  if (typeof body.socialTwitter === 'string') data.socialTwitter = body.socialTwitter.trim().slice(0, 200) || null
  if (typeof body.socialInstagram === 'string') data.socialInstagram = body.socialInstagram.trim().slice(0, 200) || null
  if (typeof body.socialFacebook === 'string') data.socialFacebook = body.socialFacebook.trim().slice(0, 200) || null
  if (typeof body.socialSnapchat === 'string') data.socialSnapchat = body.socialSnapchat.trim().slice(0, 200) || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: session.user.id }, data })
  return NextResponse.json({ ok: true })
}
