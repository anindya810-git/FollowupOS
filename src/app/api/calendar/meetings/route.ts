import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUpcomingGoogleEvents } from '@/lib/gmail'
import { getUpcomingOutlookEvents } from '@/lib/outlook'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await prisma.emailAccount.findMany({ where: { userId: session.user.id, connectedStatus: 'connected' } })
  const meetingsByEmail: Record<string, { subject: string; startTime: string }> = {}

  for (const acc of accounts) {
    try {
      if (acc.provider === 'gmail') {
        const events = await getUpcomingGoogleEvents(acc.id)
        for (const e of events) {
          for (const a of e.attendees ?? []) {
            if (a.email) {
              const k = a.email.toLowerCase()
              if (!meetingsByEmail[k]) {
                meetingsByEmail[k] = { subject: e.summary ?? 'Meeting', startTime: e.start.dateTime ?? e.start.date ?? '' }
              }
            }
          }
        }
      } else if (acc.provider === 'outlook') {
        const events = await getUpcomingOutlookEvents(acc.id)
        for (const e of events) {
          for (const a of e.attendees ?? []) {
            const k = a.emailAddress?.address?.toLowerCase()
            if (k && !meetingsByEmail[k]) {
              meetingsByEmail[k] = { subject: e.subject ?? 'Meeting', startTime: e.start.dateTime }
            }
          }
        }
      }
    } catch (e) {
      console.error('Calendar fetch failed for', acc.id, e)
    }
  }

  return NextResponse.json({ meetings: meetingsByEmail })
}
