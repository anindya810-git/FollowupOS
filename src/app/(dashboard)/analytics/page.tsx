import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <AnalyticsClient userEmail={session.user.email || ''} />
}
