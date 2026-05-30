import { prisma } from './prisma'
import { sendPushToUser } from './push'
import { safeLog } from './safe-log'

export interface WatchTriggerMessage {
  providerMessageId: string
  senderEmail: string
  senderName: string | null
  sentAt: Date | null
}

/**
 * Fire a push notification when a newly-arrived inbound message belongs to a
 * thread / person / domain on the user's watchlist. This is independent of the
 * urgency classification — watched mail always notifies, in addition to the
 * urgent ones Pendingly surfaces on its own.
 *
 * Safety / correctness rules:
 *  - Only the latest INBOUND message can trigger (never the user's own reply).
 *  - We only notify for mail that arrived AFTER the watch entry was created, so
 *    adding a watch never retroactively pings old mail or floods on first scan.
 *  - De-duped via the WatchNotification table so re-scanning the same thread
 *    never re-notifies for the same message.
 *  - The whole body is wrapped in try/catch: if the WatchList/WatchNotification
 *    tables don't exist yet (migration pending) or push isn't configured, a
 *    scan must never break because of it.
 */
export async function notifyWatchlistMatch(opts: {
  userId: string
  providerThreadId: string
  subject: string
  latestInbound: WatchTriggerMessage | null
}): Promise<void> {
  const { userId, providerThreadId, subject, latestInbound } = opts
  try {
    if (!latestInbound || !latestInbound.sentAt) return

    const senderEmail = latestInbound.senderEmail.trim().toLowerCase()
    const domain = senderEmail.includes('@') ? senderEmail.split('@')[1] : ''

    const matches = await prisma.watchList.findMany({
      where: {
        userId,
        OR: [
          { threadId: providerThreadId },
          ...(senderEmail ? [{ senderEmail }] : []),
          ...(domain ? [{ domain }] : []),
        ],
      },
    })
    if (matches.length === 0) return

    // Only notify for mail newer than the watch entry that matched it.
    const sentMs = latestInbound.sentAt.getTime()
    if (!matches.some(m => m.createdAt.getTime() < sentMs)) return

    // De-dupe: record the message first so a concurrent/repeat scan can't
    // double-send. The unique constraint makes the create throw on a repeat,
    // which we treat as "already notified".
    try {
      await prisma.watchNotification.create({
        data: { userId, providerMessageId: latestInbound.providerMessageId },
      })
    } catch {
      return // already notified for this message
    }

    const who = latestInbound.senderName || latestInbound.senderEmail || 'A watched contact'
    await sendPushToUser(userId, {
      title: `👀 Watchlist: ${who}`,
      body: subject || 'New message on a thread you’re watching',
      url: '/queue',
    })
  } catch (e) {
    safeLog('warn', 'watchlist-notify', e)
  }
}
