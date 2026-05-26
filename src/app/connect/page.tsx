import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ConnectProviderButtons } from '@/components/auth/ConnectProviderButtons'
import { LogoMark } from '@/components/ui/Logo'

export default async function ConnectPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  // Returning user: already connected an inbox → go straight to dashboard
  const [user, existingAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true },
    }),
    prisma.emailAccount.findFirst({
      where: { userId: session.user.id, connectedStatus: 'connected' },
      select: { id: true },
    }),
  ])
  if (user?.onboardingCompleted || existingAccount) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)] flex items-center gap-2">
        <LogoMark className="h-5 w-6 flex-shrink-0" />
        <span className="text-sm font-semibold tracking-widest uppercase text-ink">Pendingly</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(11_18_32/30%)] mb-4">Step 1 of 3</p>
          <h1 className="text-3xl font-bold text-ink mb-2">Connect your inbox</h1>
          <p className="text-[rgb(11_18_32/55%)] mb-8">
            Choose a provider below. You can add more inboxes later from Settings.
          </p>

          <ConnectProviderButtons />

          <div className="mt-8 space-y-2 border-t border-[rgb(11_18_32/8%)] pt-6">
            {[
              'Read-only — we never send emails on your behalf',
              'Scans 3–30 days of email history depending on your plan',
              'Disconnect any account at any time from Settings',
            ].map(text => (
              <p key={text} className="text-xs text-[rgb(11_18_32/55%)] flex items-start gap-2">
                <span className="mt-0.5 text-action">·</span>
                {text}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
