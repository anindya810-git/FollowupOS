import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSessionFromCookies } from '@/lib/admin-auth'

export const metadata: Metadata = { title: 'Pendingly Admin' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Login page is exempted inside its own page — handled by checking pathname pattern
  // We can't easily get pathname in layout, so we use a different approach:
  // wrap the session check inside each protected page, and keep layout minimal.
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
