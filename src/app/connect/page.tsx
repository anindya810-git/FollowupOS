import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ConnectProviderButtons } from '@/components/auth/ConnectProviderButtons'
import { Shield, Eye, Zap, Clock } from 'lucide-react'

export default async function ConnectPage() {
  const session = await auth()
  if (!session?.user) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">FollowUpOS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose your email provider</h1>
          <p className="text-gray-600">
            FollowUpOS will scan your last 30 days of emails to build your action queue.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">What we access</h2>
          <div className="space-y-3">
            {[
              { icon: Eye, text: 'Read email threads to detect follow-ups' },
              { icon: Shield, text: 'We never send emails or modify your inbox' },
              { icon: Clock, text: 'We only scan the last 30 days' },
              { icon: Zap, text: 'You can disconnect anytime from Settings' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-700">
                <Icon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <ConnectProviderButtons />

        <p className="mt-4 text-center text-xs text-gray-400">
          Your data is processed to detect follow-ups only. We do not train AI models on your email data.
        </p>
      </div>
    </div>
  )
}
