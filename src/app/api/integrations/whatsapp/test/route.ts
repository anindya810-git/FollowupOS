import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppDigest } from '@/lib/whatsapp'
import { safeLog } from '@/lib/safe-log'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phone: true },
  })

  if (!user?.phone) {
    return NextResponse.json({ error: 'No phone number saved. Add one in Account settings first.' }, { status: 400 })
  }

  try {
    await sendWhatsAppDigest(user.phone, {
      userName: user.name ?? undefined,
      totalOpen: 3,
      overdueCount: 1,
      topItems: [
        { title: 'Follow up with Alex re: proposal', reason: 'No reply in 5 days', category: 'waiting', ownerName: null },
        { title: 'Chase invoice #1042', reason: 'Payment overdue', category: 'action', ownerName: null },
      ],
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    safeLog('error', 'whatsapp-test', e, { userId: session.user.id })
    const msg = e instanceof Error && e.message.includes('not configured')
      ? 'WhatsApp is not configured on the server.'
      : 'Test failed — please try again.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
