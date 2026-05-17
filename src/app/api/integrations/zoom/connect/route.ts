import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getZoomAuthUrl } from '@/lib/zoom'
import { issueOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/', process.env.APP_BASE_URL!))
  }
  if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL('/settings/connectors?error=zoom_not_configured', process.env.APP_BASE_URL!),
    )
  }
  const state = await issueOAuthState('zoom', session.user.id)
  return NextResponse.redirect(getZoomAuthUrl(state))
}
