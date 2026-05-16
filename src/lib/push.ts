import webpush from 'web-push'
import { prisma } from './prisma'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:noreply@pendingly.app'

let configured = false
function ensureConfigured() {
  if (configured) return
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  ensureConfigured()
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      } else {
        console.error('Push send failed:', e)
      }
    }
  }
}
