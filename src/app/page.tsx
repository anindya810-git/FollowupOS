import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SignInButton } from '@/components/auth/SignInButton'
import { Zap, CheckCircle, Clock, Bell } from 'lucide-react'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col">
      <header className="flex items-center gap-2 p-6">
        <Zap className="h-8 w-8 text-indigo-400" />
        <span className="text-xl font-bold text-white">FollowUpOS</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Your daily follow-up radar<br />
            <span className="text-indigo-400">for Gmail.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            FollowUpOS finds emails where you need to reply, where others owe you a response,
            and where follow-ups are overdue — automatically.
          </p>

          <SignInButton />

          <p className="mt-4 text-sm text-slate-400">
            We only read your emails to detect follow-ups. We never send emails on your behalf.
            You can disconnect anytime.
          </p>

          <div className="mt-16 grid grid-cols-3 gap-6 text-left">
            {[
              { icon: Bell, title: 'Reply Needed', desc: 'Instantly see who is waiting for your response' },
              { icon: Clock, title: 'Follow-up Due', desc: 'Never forget to follow up on pending requests' },
              { icon: CheckCircle, title: 'Commitment Tracker', desc: 'Track commitments with dates and deadlines' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl bg-white/10 backdrop-blur p-5">
                <Icon className="h-6 w-6 text-indigo-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
