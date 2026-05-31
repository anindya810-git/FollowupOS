'use client'
import { useState, useEffect } from 'react'
import { Check, Zap, Star, Gift } from 'lucide-react'
import { getUserPlan } from '@/lib/plan'

interface PlanInfo {
  type: string
  isActive: boolean
  daysLeft: number | null
  expiresAt: string | null
}

const FREE_FEATURES = [
  '1 email account',
  '1,000 AI classifications / month',
  'Last 3 days of email analysed',
  'Reply, snooze, done, ignore actions',
  'Basic follow-up tracking',
  'Referral & share bonuses',
]

const LITE_FEATURES = [
  'Everything in Free',
  'Up to 3 email accounts',
  '5,000 AI classifications / month',
  'Bring your own AI API key (Anthropic, OpenAI, Gemini)',
  'Last 7 days of email analysed',
  'Follow-up sequences (3 steps)',
  'Calendar & task auto-create',
  'Zoom meeting integration',
  'Remove "Sent via Pendingly" footer',
]

const PRO_FEATURES = [
  'Everything in Lite',
  'Unlimited email accounts',
  'Unlimited AI classifications',
  'Full 30-day email history analysed',
  'Unlimited sequence steps',
  'Priority support',
  'Early access to new features',
]

function PlanCard({
  name,
  price,
  period = '/month',
  features,
  badge,
  current,
  onUpgrade,
  highlight,
}: {
  name: string
  price: string
  period?: string
  features: string[]
  badge?: string
  current?: boolean
  onUpgrade?: () => void
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 md:p-6 flex flex-col gap-5 ${highlight ? 'border-[#0b1220] ring-1 ring-[#0b1220]' : 'border-[rgba(11,18,32,0.1)]'} bg-white`}>
      {badge && (
        <span className="self-start text-[10px] font-semibold tracking-widest uppercase bg-[#0b1220] text-white px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-[rgba(11,18,32,0.5)]">{name}</p>
        <p className="text-4xl font-bold text-[#0b1220] mt-1">
          {price}<span className="text-base font-normal text-[rgba(11,18,32,0.4)]">{period}</span>
        </p>
      </div>
      <ul className="space-y-2.5 flex-1">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-[rgba(11,18,32,0.7)]">
            <Check className="h-4 w-4 text-[#0b1220] flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      {current ? (
        <div className="w-full py-2.5 px-4 rounded-lg bg-[rgba(11,18,32,0.05)] text-center text-sm font-medium text-[rgba(11,18,32,0.45)]">
          Current plan
        </div>
      ) : onUpgrade ? (
        <button
          onClick={onUpgrade}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${highlight ? 'bg-[#0b1220] text-white hover:bg-[#1a2535]' : 'border border-[rgba(11,18,32,0.15)] text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)]'}`}
        >
          Upgrade
        </button>
      ) : null}
    </div>
  )
}

export default function UpgradePage() {
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [showPayment, setShowPayment] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plan').then(r => r.json()).then(setPlan).catch(() => {})
  }, [])

  const handleUpgrade = (tier: string) => {
    setShowPayment(tier)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-[#0b1220]">Choose your plan</h1>
        <p className="text-[rgba(11,18,32,0.5)] mt-2 text-sm">
          Start free for 3 months. Earn more free time with referrals and shares.
        </p>
        {plan?.type === 'free' && plan.daysLeft != null && (
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full">
            <Gift className="h-3.5 w-3.5" />
            {plan.daysLeft} days remaining on your free trial
          </div>
        )}
      </div>

      {showPayment && (
        <div className="mb-8 bg-[rgba(11,18,32,0.04)] border border-[rgba(11,18,32,0.1)] rounded-xl p-6 text-center">
          <Zap className="h-6 w-6 text-[#0b1220] mx-auto mb-3" />
          <p className="font-semibold text-[#0b1220] mb-1">Payment coming soon</p>
          <p className="text-sm text-[rgba(11,18,32,0.5)]">
            Stripe integration is on the way. In the meantime, email{' '}
            <a href="mailto:billing@pendingly.app" className="underline">billing@pendingly.app</a>{' '}
            to upgrade to <strong>{showPayment}</strong>.
          </p>
          <button onClick={() => setShowPayment(null)} className="mt-4 text-xs text-[rgba(11,18,32,0.4)] hover:text-[#0b1220]">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PlanCard
          name="Free Trial"
          price="$0"
          period=" / 3 months"
          features={FREE_FEATURES}
          current={plan?.type === 'free'}
        />
        <PlanCard
          name="Pendingly Lite"
          price="$9"
          features={LITE_FEATURES}
          badge="Popular"
          highlight
          current={plan?.type === 'lite'}
          onUpgrade={plan?.type !== 'lite' ? () => handleUpgrade('Pendingly Lite') : undefined}
        />
        <PlanCard
          name="Pendingly Pro"
          price="$15"
          features={PRO_FEATURES}
          current={plan?.type === 'pro'}
          onUpgrade={plan?.type !== 'pro' ? () => handleUpgrade('Pendingly Pro') : undefined}
        />
      </div>

      <div className="mt-10 rounded-xl bg-[rgba(11,18,32,0.03)] border border-[rgba(11,18,32,0.07)] p-6">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#0b1220] text-sm">Earn more free time</p>
            <ul className="mt-2 space-y-1 text-sm text-[rgba(11,18,32,0.6)]">
              <li>• Refer a friend → get <strong>30 free days</strong> added to your current plan</li>
              <li>• Share your stats on social media → get <strong>7 free days</strong> (once per day)</li>
            </ul>
            <a href="/referral" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#0b1220] underline underline-offset-2 hover:opacity-70">
              Go to your referral dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
