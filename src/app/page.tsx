import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SignInButton } from '@/components/auth/SignInButton'
import { LogoMark } from '@/components/ui/Logo'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-[rgb(11_18_32/8%)] bg-paper">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-6 flex-shrink-0" />
          <span className="text-sm font-semibold tracking-widest uppercase text-ink">Pendingly</span>
        </div>
        <SignInButton />
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl w-full py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(11_18_32/30%)] mb-6">Email follow-up, automated</p>
          <h1 className="text-5xl font-bold text-ink leading-tight mb-6">
            Never miss a follow-up again.
          </h1>
          <p className="text-lg text-[rgb(11_18_32/55%)] mb-10 leading-relaxed">
            Pendingly connects to Gmail and Outlook, scans your inbox with AI, and surfaces exactly
            who needs a reply, who owes you one, and what&apos;s overdue — every day.
          </p>
          <SignInButton />
          <p className="mt-4 text-xs text-[rgb(11_18_32/30%)]">
            Read-only access · No emails sent on your behalf · Disconnect anytime
          </p>

          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-[rgb(11_18_32/8%)] pt-12">
            {[
              { num: '01', title: 'Connect', desc: 'Link Gmail and/or Outlook in one click' },
              { num: '02', title: 'Scan', desc: 'AI reads 30 days of threads in ~2 minutes' },
              { num: '03', title: 'Act', desc: 'Work through your prioritised queue daily' },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <p className="text-xs text-[rgb(11_18_32/30%)] font-medium mb-2">{num}</p>
                <p className="text-sm font-semibold text-ink mb-1">{title}</p>
                <p className="text-sm text-[rgb(11_18_32/55%)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
