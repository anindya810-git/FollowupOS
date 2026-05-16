import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  // Push endpoints must be https — guard against attacker-controlled subscriptions later.
  try {
    const u = new URL(body.endpoint)
    if (u.protocol !== 'https:') {
      return NextResponse.json({ error: 'Push endpoint must be https' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid endpoint URL' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { endpoint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint: body.endpoint },
  })
  return NextResponse.json({ ok: true })
}
