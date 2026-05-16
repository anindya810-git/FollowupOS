import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  let showOnboarding = false
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true, name: true, email: true },
    })
    showOnboarding = !user?.onboardingCompleted
  }
  return (
    <DashboardClient
      userEmail={session?.user?.email || ''}
      showOnboarding={showOnboarding}
    />
  )
}
