import { prisma } from './prisma'

export async function upsertContact(userId: string, email: string, name: string | null | undefined) {
  if (!email) return
  const trimmedEmail = email.toLowerCase().trim()
  const trimmedName = name?.trim() || null

  await prisma.contact.upsert({
    where: { userId_email: { userId, email: trimmedEmail } },
    create: { userId, email: trimmedEmail, name: trimmedName },
    update: trimmedName ? { name: trimmedName } : {},
  })
}

export async function resolveContactName(userId: string, email: string): Promise<string | null> {
  if (!email) return null
  const contact = await prisma.contact.findUnique({
    where: { userId_email: { userId, email: email.toLowerCase().trim() } },
    select: { name: true },
  })
  return contact?.name ?? null
}

export async function buildContactsFromMessages(userId: string, emailAccountIds?: string[]) {
  // Extract all unique sender name/email pairs from stored messages for this user,
  // optionally filtered to specific connected inboxes.
  const messages = await prisma.emailMessage.findMany({
    where: {
      userId,
      senderEmail: { not: null },
      isFromUser: false,
      ...(emailAccountIds?.length
        ? { emailThread: { emailAccountId: { in: emailAccountIds } } }
        : {}),
    },
    select: { senderEmail: true, senderName: true },
    distinct: ['senderEmail'],
  })

  const rows = messages.filter(m => m.senderEmail)

  // Use allSettled so one failing row doesn't abort the rest.
  const results = await Promise.allSettled(
    rows.map(m =>
      prisma.contact.upsert({
        where: { userId_email: { userId, email: m.senderEmail!.toLowerCase() } },
        create: { userId, email: m.senderEmail!.toLowerCase(), name: m.senderName || null },
        update: m.senderName ? { name: m.senderName } : {},
      })
    )
  )

  return results.filter(r => r.status === 'fulfilled').length
}
