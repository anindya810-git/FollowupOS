import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendTeamsDigest } from '@/lib/teams'
import { isTeamsWebhookUrl } from '@/lib/net-safety'
import { safeLog } from '@/lib/safe-log'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { webhookUrl?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.webhookUrl) return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 })
  if (!isTeamsWebhookUrl(body.webhookUrl)) {
    return NextResponse.json({ error: 'Invalid Teams webhook URL — must be https://*.webhook.office.com/... or https://*.office.com/...' }, { status: 400 })
  }
  try {
    await sendTeamsDigest(body.webhookUrl, {
      totalOpen: 0, overdueCount: 0,
      topItems: [{ title: 'Test from Pendingly', reason: 'If you see this, your Teams integration works.', category: 'test' }],
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    safeLog('error', 'teams-test', e, { userId: session.user.id })
    return NextResponse.json({ error: 'Test failed — check the webhook URL and try again.' }, { status: 500 })
  }
}
