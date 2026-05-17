import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOutlookAuthUrl } from '@/lib/outlook'
import { issueOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const state = await issueOAuthState('outlook', session.user.id)
  const authUrl = getOutlookAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
