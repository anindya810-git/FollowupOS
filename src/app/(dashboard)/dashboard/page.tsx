import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  let showOnboarding = false
  if (session?.user?.id) {
    const [user, emailAccount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboardingCompleted: true, name: true, email: true },
      }),
      prisma.emailAccount.findFirst({
        where: { userId: session.user.id, connectedStatus: 'connected' },
        select: { id: true },
      }),
    ])

    // Brand-new user who hasn't connected an inbox yet → send to onboarding
    if (!emailAccount) redirect('/connect')

    showOnboarding = !user?.onboardingCompleted
  }
  return (
    <DashboardClient
      userEmail={session?.user?.email || ''}
      showOnboarding={showOnboarding}
    />
  )
}
