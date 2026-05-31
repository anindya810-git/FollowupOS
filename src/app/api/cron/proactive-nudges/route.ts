import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPausedUserIds } from '@/lib/pause'
import { sendPushToUser } from '@/lib/push'
import { resolveAiConfig, generateDraft } from '@/lib/ai'
import { getRecentlyEndedGoogleEvents } from '@/lib/gmail'
import { getRecentlyEndedOutlookEvents } from '@/lib/outlook'
import { safeLog } from '@/lib/safe-log'

// Runs once a day (Vercel Hobby caps crons at daily), so look back ~26h to
// catch every meeting that ended since the previous run. ProactiveNudge
// de-dupes, so the overlap never produces a duplicate draft.
const MEETING_LOOKBACK_HOURS = 26

// Reserve a nudge atomically. Returns true if this is the first time (so we
// should act), false if we've already nudged for it.
async function claimNudge(userId: string, kind: string, refId: string): Promise<boolean> {
  try {
    await prisma.proactiveNudge.create({ data: { userId, kind, refId } })
    return true
  } catch {
    return false // unique violation — already nudged (or table missing)
  }
}

async function runMeetingFollowups(pausedUserIds: Set<string>) {
  let drafted = 0
  const accounts = await prisma.emailAccount.findMany({
    where: { connectedStatus: 'connected', provider: { in: ['gmail', 'outlook'] } },
    select: { id: true, userId: true, provider: true, emailAddress: true },
  })

  for (const account of accounts) {
    if (pausedUserIds.has(account.userId)) continue
    try {
      const events = account.provider === 'gmail'
        ? await getRecentlyEndedGoogleEvents(account.id, MEETING_LOOKBACK_HOURS)
        : await getRecentlyEndedOutlookEvents(account.id, MEETING_LOOKBACK_HOURS)

      const self = account.emailAddress.toLowerCase()
      for (const ev of events) {
        const attendees = ev.attendees.filter(a => a.email && a.email.toLowerCase() !== self)
        if (attendees.length === 0) continue // solo / no-one to follow up with

        if (!(await claimNudge(account.userId, 'meeting_followup', ev.id))) continue

        const primary = attendees[0]
        const attendeeNames = attendees.map(a => a.name || a.email).join(', ')

        // Draft a warm recap with next steps using the user's AI config.
        let draft = ''
        try {
          const cfg = await resolveAiConfig(account.userId)
          const result = await generateDraft({
            threadSubject: `Follow-up: ${ev.title}`,
            reason: 'You just finished a meeting; send a short recap with next steps.',
            suggestedAction: 'Write a brief, warm post-meeting follow-up: thank them, summarise what was discussed, and lay out clear next steps.',
            messages: [{
              from: attendeeNames,
              body: `Meeting "${ev.title}" with ${attendeeNames} just ended.`,
              isFromUser: false,
              sentAt: ev.endIso ?? undefined,
            }],
            tone: 'friendly',
            outputType: 'email_reply',
            userName: '',
            config: cfg,
          })
          draft = result?.draft ?? ''
        } catch (e) {
          safeLog('warn', 'meeting-followup-draft', e, { userId: account.userId })
        }

        await prisma.actionItem.create({
          data: {
            userId: account.userId,
            emailThreadId: null,
            source: 'meeting',
            category: 'followup_due',
            status: 'open',
            priority: 'medium',
            title: `Follow up: ${ev.title}`,
            reason: `Your meeting "${ev.title}" with ${attendeeNames} just ended — send a quick recap with next steps.`,
            suggestedAction: `Send a recap to ${primary.name || primary.email}.`,
            autoReplySuggestion: draft || null,
            ownerType: 'other_person',
            ownerName: primary.name ?? null,
            ownerEmail: primary.email,
            lastActivityAt: new Date(),
          },
        })

        await sendPushToUser(account.userId, {
          title: '📝 Meeting follow-up ready',
          body: `Draft a recap for "${ev.title}"${draft ? ' — a draft is ready' : ''}`,
          url: '/queue',
        }).catch(() => {})
        drafted++
      }
    } catch (e) {
      safeLog('warn', 'meeting-followups', e, { accountId: account.id })
    }
  }
  return drafted
}

async function runAnniversaryNudges(pausedUserIds: Set<string>) {
  // Deals "closed" ~1 year ago = action items completed between 12 months and
  // 12 months + a 6-day catch-up window ago (dedupe makes the window safe).
  const now = Date.now()
  const upper = new Date(now - 365 * 86400_000)
  const lower = new Date(now - 371 * 86400_000)

  let nudged = 0
  let items: Array<{ id: string; userId: string; title: string | null; ownerName: string | null }> = []
  try {
    items = await prisma.actionItem.findMany({
      where: { status: 'done', completedAt: { gte: lower, lte: upper } },
      select: { id: true, userId: true, title: true, ownerName: true },
      take: 200,
    })
  } catch (e) {
    safeLog('warn', 'anniversary-query', e)
    return 0
  }

  for (const item of items) {
    if (pausedUserIds.has(item.userId)) continue
    if (!(await claimNudge(item.userId, 'anniversary', item.id))) continue
    const who = item.ownerName ? ` with ${item.ownerName}` : ''
    const what = item.title || 'something'
    await sendPushToUser(item.userId, {
      title: '🎉 Worth reconnecting',
      body: `It's been a year since you wrapped up "${what}"${who} — a good time to check in.`,
      url: '/contacts',
    }).catch(() => {})
    nudged++
  }
  return nudged
}

async function run() {
  const paused = await getPausedUserIds()
  const [meetingDrafts, anniversaries] = await Promise.all([
    runMeetingFollowups(paused),
    runAnniversaryNudges(paused),
  ])
  return { meetingDrafts, anniversaries }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await run())
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await run())
}
