import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSafePublicHostname } from '@/lib/net-safety'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { webmailBaseUrl?: string | null; webmailSearchUrlTemplate?: string | null }
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

  const data: { webmailBaseUrl?: string | null; webmailSearchUrlTemplate?: string | null } = {}

  if (body.webmailBaseUrl !== undefined) {
    let normalisedUrl: string | null = null
    if (typeof body.webmailBaseUrl === 'string') {
      const trimmed = body.webmailBaseUrl.trim()
      if (trimmed) {
        try {
          const u = new URL(trimmed)
          if (u.protocol !== 'https:') {
            return NextResponse.json({ error: 'URL must use https://' }, { status: 400 })
          }
          if (!isSafePublicHostname(u.hostname)) {
            return NextResponse.json({ error: 'URL must point to a public host (not localhost / private IP)' }, { status: 400 })
          }
          normalisedUrl = u.toString().replace(/\/+$/, '')
        } catch {
          return NextResponse.json({ error: 'Not a valid URL' }, { status: 400 })
        }
      }
    }
    data.webmailBaseUrl = normalisedUrl
  }

  if (body.webmailSearchUrlTemplate !== undefined) {
    let template: string | null = null
    if (typeof body.webmailSearchUrlTemplate === 'string') {
      const trimmed = body.webmailSearchUrlTemplate.trim()
      if (trimmed) {
        // Validate it parses as a URL after stripping the {q} placeholder
        const probe = trimmed.replace(/\{q\}/g, 'test').replace(/\{query\}/g, 'test')
        try {
          const u = new URL(probe)
          if (u.protocol !== 'https:') {
            return NextResponse.json({ error: 'Template must use https://' }, { status: 400 })
          }
          if (!isSafePublicHostname(u.hostname)) {
            return NextResponse.json({ error: 'Template must point to a public host' }, { status: 400 })
          }
          template = trimmed
        } catch {
          return NextResponse.json({ error: 'Search template is not a valid URL' }, { status: 400 })
        }
      }
    }
    data.webmailSearchUrlTemplate = template
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.emailAccount.update({
    where: { id },
    data,
    select: { webmailBaseUrl: true, webmailSearchUrlTemplate: true },
  })

  return NextResponse.json({ ok: true, ...updated })
}
