import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGmailAuthUrl } from '@/lib/gmail'
import { issueOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const state = await issueOAuthState('gmail', session.user.id)
  const url = getGmailAuthUrl(state)
  return NextResponse.redirect(url)
}
