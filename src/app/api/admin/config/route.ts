import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

function requireAdmin(req: NextRequest) {
  const session = getAdminSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET(request: NextRequest) {
  const err = requireAdmin(request)
  if (err) return err

  const config = await prisma.adminConfig.findUnique({ where: { id: 'singleton' } })

  return NextResponse.json({
    hasStripeSecret: !!config?.stripeSecretKeyEncrypted,
    stripePublishableKey: config?.stripePublishableKey ?? '',
    hasRazorpayKeyId: !!config?.razorpayKeyIdEncrypted,
    hasRazorpaySecret: !!config?.razorpaySecretEncrypted,
    // Return partial masked values for display
    stripeSecretMasked: config?.stripeSecretKeyEncrypted
      ? 'sk_***' + decrypt(config.stripeSecretKeyEncrypted).slice(-4)
      : null,
    razorpayKeyIdMasked: config?.razorpayKeyIdEncrypted
      ? decrypt(config.razorpayKeyIdEncrypted).slice(0, 8) + '***'
      : null,
  })
}

export async function POST(request: NextRequest) {
  const err = requireAdmin(request)
  if (err) return err

  let body: {
    stripeSecretKey?: string
    stripePublishableKey?: string
    razorpayKeyId?: string
    razorpaySecret?: string
  }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data: Record<string, string | null> = {}
  if (body.stripeSecretKey !== undefined) {
    data.stripeSecretKeyEncrypted = body.stripeSecretKey ? encrypt(body.stripeSecretKey) : null
  }
  if (body.stripePublishableKey !== undefined) {
    data.stripePublishableKey = body.stripePublishableKey || null
  }
  if (body.razorpayKeyId !== undefined) {
    data.razorpayKeyIdEncrypted = body.razorpayKeyId ? encrypt(body.razorpayKeyId) : null
  }
  if (body.razorpaySecret !== undefined) {
    data.razorpaySecretEncrypted = body.razorpaySecret ? encrypt(body.razorpaySecret) : null
  }

  await prisma.adminConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  })

  return NextResponse.json({ ok: true })
}
