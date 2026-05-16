import { auth } from '@/lib/auth'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  return <DashboardClient userEmail={session?.user?.email || ''} userName={session?.user?.name || ''} />
}
