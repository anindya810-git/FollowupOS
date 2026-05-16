import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const allItems = await prisma.actionItem.findMany({
    where: { userId },
    select: {
      category: true,
      status: true,
      createdAt: true,
      ownerEmail: true,
      ownerName: true,
    },
  })

  // byStatus
  const statusMap: Record<string, number> = {}
  for (const item of allItems) {
    statusMap[item.status] = (statusMap[item.status] ?? 0) + 1
  }
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // byCategory: open/done/snoozed/ignored per category
  const categoryMap: Record<string, { open: number; done: number; snoozed: number; ignored: number }> = {}
  for (const item of allItems) {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { open: 0, done: 0, snoozed: 0, ignored: 0 }
    }
    const s = item.status as 'open' | 'done' | 'snoozed' | 'ignored'
    if (s in categoryMap[item.category]) {
      categoryMap[item.category][s]++
    }
  }
  const byCategory = Object.entries(categoryMap).map(([category, counts]) => ({
    category,
    ...counts,
  }))

  // byDayOfWeek
  const dowMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const item of allItems) {
    const day = new Date(item.createdAt).getDay()
    dowMap[day]++
  }
  const byDayOfWeek = Object.entries(dowMap).map(([dayStr, count]) => {
    const day = parseInt(dayStr, 10)
    return { day, label: DAY_LABELS[day], count }
  })

  // topContacts: open items with ownerEmail not null, top 8
  const openItems = allItems.filter(i => i.status === 'open' && i.ownerEmail)
  const contactMap: Record<string, { ownerEmail: string; ownerName: string | null; count: number }> = {}
  for (const item of openItems) {
    const email = item.ownerEmail!
    if (!contactMap[email]) {
      contactMap[email] = { ownerEmail: email, ownerName: item.ownerName, count: 0 }
    }
    contactMap[email].count++
  }
  const topContacts = Object.values(contactMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return NextResponse.json({ byCategory, byStatus, byDayOfWeek, topContacts })
}
