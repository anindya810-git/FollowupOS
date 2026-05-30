import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { imageData?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (typeof body.imageData !== 'string' || !body.imageData.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }
  // 256×256 JPEG at 0.85 quality ≈ 15–25 KB → base64 ≈ 35 KB. Reject anything over 300 KB.
  if (body.imageData.length > 300_000) {
    return NextResponse.json({ error: 'Image too large (max ~200 KB)' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { customImage: body.imageData },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.user.update({ where: { id: session.user.id }, data: { customImage: null } })
  return NextResponse.json({ ok: true })
}
