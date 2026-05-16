import { isSlackWebhookUrl } from './net-safety'

interface DigestPayload {
  userName?: string
  totalOpen: number
  overdueCount: number
  topItems: Array<{ title: string; reason: string; category: string; ownerName?: string | null }>
}

export async function sendSlackDigest(webhookUrl: string, payload: DigestPayload) {
  if (!isSlackWebhookUrl(webhookUrl)) {
    throw new Error('Invalid Slack webhook URL — must be https://hooks.slack.com/...')
  }
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: `📬 Your Pendingly digest` } },
    { type: 'section', fields: [
      { type: 'mrkdwn', text: `*Open follow-ups:*\n${payload.totalOpen}` },
      { type: 'mrkdwn', text: `*Overdue:*\n${payload.overdueCount}` },
    ]},
    { type: 'divider' },
  ]

  if (payload.topItems.length > 0) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '*Top priorities today:*' } })
    for (const item of payload.topItems.slice(0, 5)) {
      const owner = item.ownerName ? ` — _${item.ownerName}_` : ''
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `• *${item.title}*${owner}\n   ${item.reason}` },
      })
    }
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks, text: `${payload.totalOpen} open follow-ups, ${payload.overdueCount} overdue` }),
  })
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`)
}
