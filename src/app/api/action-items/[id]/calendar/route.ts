import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createGoogleCalendarEvent,
  createGoogleTask,
  deleteGoogleCalendarEvent,
  deleteGoogleTask,
} from '@/lib/gmail'
import {
  createOutlookCalendarEvent,
  createOutlookTask,
  deleteOutlookCalendarEvent,
  deleteOutlookTask,
} from '@/lib/outlook'
import { createZoomMeeting } from '@/lib/zoom'
import { safeLog } from '@/lib/safe-log'

interface CalendarRequestBody {
  kind?: 'event' | 'task'
  title?: string
  description?: string
  startIso?: string
  endIso?: string
  reminderMinutes?: number
  meetingProvider?: 'none' | 'meet' | 'teams' | 'zoom'
  attendees?: string[]
  calendarProvider?: 'gmail' | 'outlook'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let body: CalendarRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: { emailThread: { include: { emailAccount: true } } },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If the client specifies a calendarProvider (e.g. user picked a different calendar
  // from the "Create in" selector), look up that account. Otherwise fall back to the
  // account linked to this action item's email thread.
  let account = item.emailThread?.emailAccount ?? null
  if (body.calendarProvider && body.calendarProvider !== account?.provider) {
    const override = await prisma.emailAccount.findFirst({
      where: { userId: session.user.id, provider: body.calendarProvider, connectedStatus: 'connected' },
    })
    if (override) account = override
  }
  if (!account) {
    return NextResponse.json({ error: 'No email account linked to this item' }, { status: 400 })
  }
  if (account.provider !== 'gmail' && account.provider !== 'outlook') {
    return NextResponse.json(
      { error: 'Calendar is only available for Gmail and Outlook accounts' },
      { status: 400 },
    )
  }

  const kind = body.kind ?? 'event'
  const title = (body.title || item.title || 'Follow-up').trim()
  const description = (body.description || item.suggestedAction || item.reason || '').trim()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })
  const tz = user?.timezone || 'UTC'

  try {
    if (kind === 'task') {
      // Tasks use due date only — derive from startIso or dueDate.
      const due = body.startIso || (item.dueDate ? `${item.dueDate}T09:00:00Z` : undefined)
      if (account.provider === 'gmail') {
        const { taskId } = await createGoogleTask(account.id, {
          title,
          notes: description,
          dueIso: due,
        })
        await prisma.actionItem.update({
          where: { id },
          data: { calendarTaskId: taskId, calendarTaskProvider: 'google' },
        })
        return NextResponse.json({ ok: true, kind: 'task', provider: 'google', taskId })
      } else {
        const { taskId, listId } = await createOutlookTask(account.id, {
          title,
          bodyText: description,
          dueIso: due,
          timezone: tz,
        })
        await prisma.actionItem.update({
          where: { id },
          data: { calendarTaskId: `${listId}:${taskId}`, calendarTaskProvider: 'outlook' },
        })
        return NextResponse.json({ ok: true, kind: 'task', provider: 'outlook', taskId })
      }
    }

    // Event
    if (!body.startIso || !body.endIso) {
      return NextResponse.json({ error: 'startIso and endIso required for events' }, { status: 400 })
    }
    const meetingProvider = body.meetingProvider || 'none'

    // Optionally pre-create a Zoom meeting and append its join link to the description
    let zoomJoinUrl: string | undefined
    if (meetingProvider === 'zoom') {
      const startMs = new Date(body.startIso).getTime()
      const endMs = new Date(body.endIso).getTime()
      const durationMin = Math.max(15, Math.round((endMs - startMs) / 60_000))
      const zoom = await createZoomMeeting(session.user.id, {
        topic: title,
        startIso: body.startIso,
        durationMinutes: durationMin,
        timezone: tz,
        agenda: description,
      })
      zoomJoinUrl = zoom.joinUrl
    }
    const fullDescription = zoomJoinUrl
      ? `${description}\n\nZoom: ${zoomJoinUrl}`
      : description

    if (account.provider === 'gmail') {
      const event = await createGoogleCalendarEvent(account.id, {
        summary: title,
        description: fullDescription,
        startIso: body.startIso,
        endIso: body.endIso,
        attendees: body.attendees,
        reminderMinutes: body.reminderMinutes,
        withMeetLink: meetingProvider === 'meet',
      })
      await prisma.actionItem.update({
        where: { id },
        data: { calendarEventId: event.eventId, calendarEventProvider: 'google' },
      })
      return NextResponse.json({
        ok: true,
        kind: 'event',
        provider: 'google',
        eventId: event.eventId,
        htmlLink: event.htmlLink,
        meetLink: event.meetLink || zoomJoinUrl,
      })
    } else {
      const event = await createOutlookCalendarEvent(account.id, {
        subject: title,
        bodyHtml: `<p>${fullDescription.replace(/\n/g, '<br>')}</p>`,
        startIso: body.startIso,
        endIso: body.endIso,
        timezone: tz,
        attendees: body.attendees,
        reminderMinutes: body.reminderMinutes,
        withTeamsLink: meetingProvider === 'teams',
      })
      await prisma.actionItem.update({
        where: { id },
        data: { calendarEventId: event.eventId, calendarEventProvider: 'outlook' },
      })
      return NextResponse.json({
        ok: true,
        kind: 'event',
        provider: 'outlook',
        eventId: event.eventId,
        webLink: event.webLink,
        teamsLink: event.teamsLink || zoomJoinUrl,
      })
    }
  } catch (e) {
    safeLog('error', 'action-item-calendar', e, { itemId: id })
    return NextResponse.json(
      { error: 'Failed to create. The account may need to be reconnected with the new calendar scope.' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: { emailThread: { include: { emailAccount: true } } },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const account = item.emailThread?.emailAccount

  try {
    if (item.calendarEventId && account) {
      if (item.calendarEventProvider === 'google') {
        await deleteGoogleCalendarEvent(account.id, item.calendarEventId)
      } else if (item.calendarEventProvider === 'outlook') {
        await deleteOutlookCalendarEvent(account.id, item.calendarEventId)
      }
    }
    if (item.calendarTaskId && account) {
      if (item.calendarTaskProvider === 'google') {
        await deleteGoogleTask(account.id, item.calendarTaskId)
      } else if (item.calendarTaskProvider === 'outlook') {
        const [listId, taskId] = item.calendarTaskId.split(':')
        if (listId && taskId) await deleteOutlookTask(account.id, listId, taskId)
      }
    }
  } catch (e) {
    safeLog('warn', 'action-item-calendar-delete', e, { itemId: id })
  }

  await prisma.actionItem.update({
    where: { id },
    data: {
      calendarEventId: null,
      calendarEventProvider: null,
      calendarTaskId: null,
      calendarTaskProvider: null,
    },
  })
  return NextResponse.json({ ok: true })
}
