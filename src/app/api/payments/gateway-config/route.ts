import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Public gateway availability — no secrets exposed, just whether gateways are configured.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.adminConfig.findUnique({ where: { id: 'singleton' } })

  return NextResponse.json({
    stripeReady: !!config?.stripeSecretKeyEncrypted && !!config?.stripePublishableKey,
    razorpayReady: !!config?.razorpayKeyIdEncrypted && !!config?.razorpaySecretEncrypted,
    stripePublishableKey: config?.stripePublishableKey ?? null,
  })
}
