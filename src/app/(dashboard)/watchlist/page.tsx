import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WatchlistClient } from './WatchlistClient'

export default async function WatchlistPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <WatchlistClient />
}
