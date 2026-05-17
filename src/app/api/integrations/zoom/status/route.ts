import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ connected: false })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { zoomAccessTokenEncrypted: true, zoomAccountEmail: true },
  })
  return NextResponse.json({
    connected: !!user?.zoomAccessTokenEncrypted,
    accountEmail: user?.zoomAccountEmail ?? null,
    configured: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
  })
}
