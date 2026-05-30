import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSlackWebhookUrl, isTeamsWebhookUrl } from '@/lib/net-safety'
import { sanitizeEmailHtml } from '@/lib/email-safety'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [appSettings, digestSettings, ignoredSenders, watchList] = await Promise.all([
    prisma.appSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.digestSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.ignoredSender.findMany({ where: { userId: session.user.id } }),
    // Resilient: if the WatchList table doesn't exist yet (migration pending),
    // don't break the entire settings page — just return an empty list.
    prisma.watchList.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
  ])

  return NextResponse.json({ appSettings, digestSettings, ignoredSenders, watchList })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const {
    defaultFollowupDays, scanWindowDays, conservativeMode,
    autoFollowupEnabled, autoFollowupDays, autoFollowupTemplate,
    followupSequenceJson,
    calendarAutoCreate, defaultMeetingProvider, reminderPushEnabled,
    signatureHtml, emailSignatureEnabled,
    noiseFilterLevel,
    scanInstructions,
    enabledConnectors,
    automationPaused,
    followupApprovalMode,
    isEnabled, digestTime, timezone, slackWebhookUrl, slackEnabled,
    teamsWebhookUrl, teamsEnabled,
    whatsappEnabled,
  } = body

  const appData: Record<string, unknown> = {}
  if (defaultFollowupDays !== undefined) appData.defaultFollowupDays = defaultFollowupDays
  if (scanWindowDays !== undefined) appData.scanWindowDays = scanWindowDays
  if (conservativeMode !== undefined) appData.conservativeMode = conservativeMode
  if (noiseFilterLevel !== undefined) {
    const lvl = Number(noiseFilterLevel)
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > 5) {
      return NextResponse.json({ error: 'noiseFilterLevel must be 1–5' }, { status: 400 })
    }
    appData.noiseFilterLevel = lvl
  }
  if (autoFollowupEnabled !== undefined) appData.autoFollowupEnabled = autoFollowupEnabled
  if (autoFollowupDays !== undefined) appData.autoFollowupDays = autoFollowupDays
  if (autoFollowupTemplate !== undefined) appData.autoFollowupTemplate = autoFollowupTemplate
  if (followupSequenceJson !== undefined) {
    // Validate it parses as array of {dayOffset, tone, template}
    if (followupSequenceJson === null || followupSequenceJson === '') {
      appData.followupSequenceJson = null
    } else if (typeof followupSequenceJson === 'string') {
      try {
        const parsed = JSON.parse(followupSequenceJson)
        if (!Array.isArray(parsed)) throw new Error('not an array')
        appData.followupSequenceJson = followupSequenceJson
      } catch {
        return NextResponse.json({ error: 'followupSequenceJson must be a JSON array' }, { status: 400 })
      }
    }
  }
  if (calendarAutoCreate !== undefined) {
    if (!['off', 'event', 'task', 'both'].includes(String(calendarAutoCreate))) {
      return NextResponse.json({ error: 'Invalid calendarAutoCreate' }, { status: 400 })
    }
    appData.calendarAutoCreate = calendarAutoCreate
  }
  if (defaultMeetingProvider !== undefined) {
    if (!['none', 'meet', 'teams', 'zoom'].includes(String(defaultMeetingProvider))) {
      return NextResponse.json({ error: 'Invalid defaultMeetingProvider' }, { status: 400 })
    }
    appData.defaultMeetingProvider = defaultMeetingProvider
  }
  if (reminderPushEnabled !== undefined) appData.reminderPushEnabled = !!reminderPushEnabled
  if (automationPaused !== undefined) appData.automationPaused = !!automationPaused
  if (followupApprovalMode !== undefined) appData.followupApprovalMode = !!followupApprovalMode
  if (emailSignatureEnabled !== undefined) appData.emailSignatureEnabled = !!emailSignatureEnabled
  if (scanInstructions !== undefined) {
    const trimmed = typeof scanInstructions === 'string' ? scanInstructions.trim() : ''
    appData.scanInstructions = trimmed.slice(0, 2000) || null
  }
  if (enabledConnectors !== undefined) {
    // Accept an array of known connector keys; store as JSON string.
    const ALLOWED = ['google_calendar', 'google_meet', 'outlook_calendar', 'microsoft_teams']
    if (!Array.isArray(enabledConnectors) || !enabledConnectors.every(k => ALLOWED.includes(String(k)))) {
      return NextResponse.json({ error: 'Invalid enabledConnectors' }, { status: 400 })
    }
    const unique = Array.from(new Set(enabledConnectors.map(String)))
    appData.enabledConnectors = unique.length ? JSON.stringify(unique) : null
  }
  if (signatureHtml !== undefined) {
    // Sanitise on save so we never store anything dangerous that would later
    // be rendered into the editor or emailed out.
    appData.signatureHtml = typeof signatureHtml === 'string' && signatureHtml.trim()
      ? sanitizeEmailHtml(signatureHtml)
      : null
  }

  const digestData: Record<string, unknown> = {}
  if (isEnabled !== undefined) digestData.isEnabled = isEnabled
  if (digestTime !== undefined) digestData.digestTime = digestTime
  if (timezone !== undefined) digestData.timezone = timezone
  if (slackWebhookUrl !== undefined) {
    if (slackWebhookUrl && !isSlackWebhookUrl(String(slackWebhookUrl))) {
      return NextResponse.json({ error: 'Invalid Slack webhook URL' }, { status: 400 })
    }
    digestData.slackWebhookUrl = slackWebhookUrl || null
  }
  if (slackEnabled !== undefined) digestData.slackEnabled = slackEnabled
  if (teamsWebhookUrl !== undefined) {
    if (teamsWebhookUrl && !isTeamsWebhookUrl(String(teamsWebhookUrl))) {
      return NextResponse.json({ error: 'Invalid Teams webhook URL' }, { status: 400 })
    }
    digestData.teamsWebhookUrl = teamsWebhookUrl || null
  }
  if (teamsEnabled !== undefined) digestData.teamsEnabled = teamsEnabled
  if (whatsappEnabled !== undefined) digestData.whatsappEnabled = !!whatsappEnabled

  await Promise.all([
    Object.keys(appData).length > 0 ? prisma.appSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...appData },
      update: appData,
    }) : null,
    Object.keys(digestData).length > 0 ? prisma.digestSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...digestData },
      update: digestData,
    }) : null,
  ])

  return NextResponse.json({ success: true })
}
