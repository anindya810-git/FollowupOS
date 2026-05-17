import { prisma } from './prisma'
import {
  createGoogleCalendarEvent,
  createGoogleTask,
} from './gmail'
import {
  createOutlookCalendarEvent,
  createOutlookTask,
} from './outlook'
import { safeLog } from './safe-log'

// Best-effort auto-create of calendar event / task for a newly created action item.
// Never throws — failures are logged but do not block scan progress.
export async function maybeAutoCreateCalendar(
  userId: string,
  actionItemId: string,
): Promise<void> {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { userId },
      select: { calendarAutoCreate: true, defaultMeetingProvider: true },
    })
    const mode = settings?.calendarAutoCreate ?? 'off'
    if (mode === 'off') return

    const item = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      include: { emailThread: { include: { emailAccount: true } } },
    })
    if (!item || !item.emailThread?.emailAccount) return
    if (item.calendarEventId || item.calendarTaskId) return  // idempotent

    const account = item.emailThread.emailAccount
    if (account.provider !== 'gmail' && account.provider !== 'outlook') return

    const title = item.title || item.emailThread.subject || 'Follow-up'
    const description = item.suggestedAction || item.reason || ''
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const tz = user?.timezone || 'UTC'

    // Use item.dueDate (YYYY-MM-DD) or default to tomorrow 9am local
    const dueDateStr = item.dueDate || (() => {
      const d = new Date(); d.setDate(d.getDate() + 1)
      return d.toISOString().split('T')[0]
    })()
    const startIso = `${dueDateStr}T09:00:00`
    const endIso = `${dueDateStr}T09:30:00`

    if (mode === 'event' || mode === 'both') {
      try {
        if (account.provider === 'gmail') {
          const wantMeet = settings?.defaultMeetingProvider === 'meet'
          const ev = await createGoogleCalendarEvent(account.id, {
            summary: title,
            description,
            startIso: new Date(startIso).toISOString(),
            endIso: new Date(endIso).toISOString(),
            withMeetLink: wantMeet,
          })
          await prisma.actionItem.update({
            where: { id: actionItemId },
            data: { calendarEventId: ev.eventId, calendarEventProvider: 'google' },
          })
        } else {
          const wantTeams = settings?.defaultMeetingProvider === 'teams'
          const ev = await createOutlookCalendarEvent(account.id, {
            subject: title,
            bodyHtml: `<p>${description.replace(/\n/g, '<br>')}</p>`,
            startIso, endIso, timezone: tz,
            withTeamsLink: wantTeams,
          })
          await prisma.actionItem.update({
            where: { id: actionItemId },
            data: { calendarEventId: ev.eventId, calendarEventProvider: 'outlook' },
          })
        }
      } catch (e) {
        safeLog('warn', 'auto-calendar-event', e, { itemId: actionItemId })
      }
    }

    if (mode === 'task' || mode === 'both') {
      try {
        if (account.provider === 'gmail') {
          const t = await createGoogleTask(account.id, {
            title, notes: description,
            dueIso: `${dueDateStr}T00:00:00Z`,
          })
          await prisma.actionItem.update({
            where: { id: actionItemId },
            data: { calendarTaskId: t.taskId, calendarTaskProvider: 'google' },
          })
        } else {
          const t = await createOutlookTask(account.id, {
            title, bodyText: description,
            dueIso: startIso, timezone: tz,
          })
          await prisma.actionItem.update({
            where: { id: actionItemId },
            data: { calendarTaskId: `${t.listId}:${t.taskId}`, calendarTaskProvider: 'outlook' },
          })
        }
      } catch (e) {
        safeLog('warn', 'auto-calendar-task', e, { itemId: actionItemId })
      }
    }
  } catch (e) {
    safeLog('warn', 'auto-calendar', e, { itemId: actionItemId })
  }
}
