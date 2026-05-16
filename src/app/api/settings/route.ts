import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [appSettings, digestSettings, ignoredSenders] = await Promise.all([
    prisma.appSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.digestSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.ignoredSender.findMany({ where: { userId: session.user.id } }),
  ])

  return NextResponse.json({ appSettings, digestSettings, ignoredSenders })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { defaultFollowupDays, scanWindowDays, conservativeMode, isEnabled, digestTime, timezone } = body

  const appData: Record<string, unknown> = {}
  if (defaultFollowupDays !== undefined) appData.defaultFollowupDays = defaultFollowupDays
  if (scanWindowDays !== undefined) appData.scanWindowDays = scanWindowDays
  if (conservativeMode !== undefined) appData.conservativeMode = conservativeMode

  const digestData: Record<string, unknown> = {}
  if (isEnabled !== undefined) digestData.isEnabled = isEnabled
  if (digestTime !== undefined) digestData.digestTime = digestTime
  if (timezone !== undefined) digestData.timezone = timezone

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
