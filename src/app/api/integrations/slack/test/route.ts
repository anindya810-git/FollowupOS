import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendSlackDigest } from '@/lib/slack'
import { isSlackWebhookUrl } from '@/lib/net-safety'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { webhookUrl?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.webhookUrl) return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 })
  if (!isSlackWebhookUrl(body.webhookUrl)) {
    return NextResponse.json({ error: 'Invalid Slack webhook URL — must be https://hooks.slack.com/...' }, { status: 400 })
  }
  try {
    await sendSlackDigest(body.webhookUrl, {
      totalOpen: 0, overdueCount: 0,
      topItems: [{ title: 'Test from Pendingly', reason: 'If you see this, your Slack integration works.', category: 'test' }],
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
