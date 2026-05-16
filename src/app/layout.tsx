import type { Metadata } from 'next'
import { Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })

export const metadata: Metadata = {
  title: 'Pendingly — Your follow-up radar',
  description: 'Know exactly who you need to reply to, who needs to reply to you, and what follow-ups are overdue — every day.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={hanken.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
