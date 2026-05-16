import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { HelpClient } from './HelpClient'

export default async function HelpPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <HelpClient userEmail={session.user.email || ''} />
}
