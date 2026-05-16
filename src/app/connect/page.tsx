import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ConnectProviderButtons } from '@/components/auth/ConnectProviderButtons'

export default async function ConnectPage() {
  const session = await auth()
  if (!session?.user) redirect('/')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-8 py-5 border-b border-gray-100">
        <span className="text-sm font-semibold tracking-widest uppercase text-gray-900">FollowUpOS</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Step 1 of 2</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect your inbox</h1>
          <p className="text-gray-500 mb-8">
            Choose a provider below. You can add more inboxes later from Settings.
          </p>

          <ConnectProviderButtons />

          <div className="mt-8 space-y-2 border-t border-gray-100 pt-6">
            {[
              'Read-only — we never send emails on your behalf',
              'Only the last 30 days of email are scanned',
              'Disconnect any account at any time from Settings',
            ].map(text => (
              <p key={text} className="text-xs text-gray-400 flex items-start gap-2">
                <span className="mt-0.5 text-gray-300">—</span>
                {text}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
