import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ApprovalsClient } from './ApprovalsClient'

export default async function ApprovalsPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <ApprovalsClient />
}
