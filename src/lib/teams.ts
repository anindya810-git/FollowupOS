import { isTeamsWebhookUrl } from './net-safety'

interface DigestPayload {
  userName?: string
  totalOpen: number
  overdueCount: number
  topItems: Array<{ title: string; reason: string; category: string; ownerName?: string | null }>
}

export async function sendTeamsDigest(webhookUrl: string, payload: DigestPayload) {
  if (!isTeamsWebhookUrl(webhookUrl)) {
    throw new Error('Invalid Teams webhook URL — must be https://*.webhook.office.com/... or https://*.office.com/...')
  }

  const bodyItems: unknown[] = [
    {
      type: 'TextBlock',
      text: '📬 Your Pendingly Digest',
      weight: 'Bolder',
      size: 'Large',
      wrap: true,
    },
    {
      type: 'FactSet',
      facts: [
        { title: 'Open follow-ups', value: String(payload.totalOpen) },
        { title: 'Overdue', value: String(payload.overdueCount) },
      ],
    },
  ]

  if (payload.topItems.length > 0) {
    bodyItems.push({
      type: 'TextBlock',
      text: 'Top priorities today:',
      weight: 'Bolder',
      wrap: true,
    })
    for (const item of payload.topItems.slice(0, 5)) {
      const owner = item.ownerName ? ` — ${item.ownerName}` : ''
      bodyItems.push({
        type: 'TextBlock',
        text: `• **${item.title}**${owner}\n${item.reason}`,
        wrap: true,
      })
    }
  }

  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: bodyItems,
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open Pendingly',
        url: 'https://pendingly.app/dashboard',
      },
    ],
  }

  const body = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: card,
      },
    ],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Teams webhook failed: ${res.status}`)
}
