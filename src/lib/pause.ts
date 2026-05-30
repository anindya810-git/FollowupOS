import { prisma } from './prisma'

/**
 * Returns the set of userIds who have "Pause everything" (vacation mode) on.
 * Used by every cron to hold all automation for those users.
 *
 * Resilient: if the automationPaused column doesn't exist yet (migration
 * pending), this returns an empty set so crons keep running normally rather
 * than throwing.
 */
export async function getPausedUserIds(): Promise<Set<string>> {
  try {
    const rows = await prisma.appSettings.findMany({
      where: { automationPaused: true },
      select: { userId: true },
    })
    return new Set(rows.map(r => r.userId))
  } catch {
    return new Set()
  }
}
