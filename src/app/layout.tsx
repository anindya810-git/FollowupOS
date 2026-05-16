import type { Metadata } from 'next'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  weight: ['400', '500', '600', '700', '800'],
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Pendingly — Your follow-up radar',
  description: 'Know exactly who you need to reply to, who needs to reply to you, and what follow-ups are overdue — every day.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${hanken.className} ${mono.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
