import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { disconnectZoom } from '@/lib/zoom'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await disconnectZoom(session.user.id)
  return NextResponse.json({ ok: true })
}
