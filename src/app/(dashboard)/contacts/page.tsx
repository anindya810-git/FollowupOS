import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ContactsClient } from './ContactsClient'

export default async function ContactsPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <ContactsClient />
}
