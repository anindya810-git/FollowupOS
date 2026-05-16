import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SignInButton } from '@/components/auth/SignInButton'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span className="text-sm font-semibold tracking-widest uppercase text-gray-900">FollowUpOS</span>
        <SignInButton />
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl w-full py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Email follow-up, automated</p>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Never miss a follow-up again.
          </h1>
          <p className="text-lg text-gray-500 mb-10 leading-relaxed">
            FollowUpOS connects to Gmail and Outlook, scans your inbox with AI, and surfaces exactly
            who needs a reply, who owes you one, and what's overdue — every day.
          </p>
          <SignInButton />
          <p className="mt-4 text-xs text-gray-400">
            Read-only access · No emails sent on your behalf · Disconnect anytime
          </p>

          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-gray-100 pt-12">
            {[
              { num: '01', title: 'Connect', desc: 'Link Gmail and/or Outlook in one click' },
              { num: '02', title: 'Scan', desc: 'AI reads 30 days of threads in ~2 minutes' },
              { num: '03', title: 'Act', desc: 'Work through your prioritised queue daily' },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <p className="text-xs text-gray-300 font-medium mb-2">{num}</p>
                <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
