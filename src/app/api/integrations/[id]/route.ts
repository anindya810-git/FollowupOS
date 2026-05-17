import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { webmailBaseUrl?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const account = await prisma.emailAccount.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let normalisedUrl: string | null = null
  if (typeof body.webmailBaseUrl === 'string') {
    const trimmed = body.webmailBaseUrl.trim()
    if (trimmed) {
      try {
        const u = new URL(trimmed)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
        }
        normalisedUrl = u.toString().replace(/\/+$/, '')
      } catch {
        return NextResponse.json({ error: 'Not a valid URL' }, { status: 400 })
      }
    }
  }

  await prisma.emailAccount.update({
    where: { id },
    data: { webmailBaseUrl: normalisedUrl },
  })

  return NextResponse.json({ ok: true, webmailBaseUrl: normalisedUrl })
}
