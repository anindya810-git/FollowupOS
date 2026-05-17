import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyOAuthState } from '@/lib/oauth-state'
import { exchangeZoomCode, persistZoomTokens, fetchZoomUserEmail } from '@/lib/zoom'
import { safeLog } from '@/lib/safe-log'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/', process.env.APP_BASE_URL!))
  }
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings/connectors?error=missing_code', process.env.APP_BASE_URL!),
    )
  }
  const ok = await verifyOAuthState('zoom', session.user.id, state)
  if (!ok) {
    return NextResponse.redirect(
      new URL('/settings/connectors?error=invalid_state', process.env.APP_BASE_URL!),
    )
  }
  try {
    const tokens = await exchangeZoomCode(code)
    const email = await fetchZoomUserEmail(tokens.access_token)
    await persistZoomTokens(session.user.id, tokens, email)
    return NextResponse.redirect(
      new URL('/settings/connectors?connected=zoom', process.env.APP_BASE_URL!),
    )
  } catch (e) {
    safeLog('error', 'zoom-callback', e, { userId: session.user.id })
    return NextResponse.redirect(
      new URL('/settings/connectors?error=zoom_exchange_failed', process.env.APP_BASE_URL!),
    )
  }
}
