'use client'
import { useState, useEffect } from 'react'
import { Check, CreditCard, Zap, Gift, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface PlanInfo {
  type: string
  isActive: boolean
  daysLeft: number | null
  expiresAt: string | null
}

interface GatewayConfig {
  stripeReady: boolean
  razorpayReady: boolean
  stripePublishableKey: string | null
}

const PLANS = [
  {
    key: 'lite',
    name: 'Pendingly Lite',
    priceUSD: 9,
    priceINR: 749,
    period: '/month',
    badge: 'Popular',
    highlight: true,
    features: [
      'Up to 3 email accounts',
      '5,000 AI classifications/month',
      'Bring your own AI API key',
      '7 days email history',
      'Follow-up sequences (3 steps)',
      'Calendar & task auto-create',
      'Remove "Sent via Pendingly" footer',
    ],
  },
  {
    key: 'pro',
    name: 'Pendingly Pro',
    priceUSD: 15,
    priceINR: 1249,
    period: '/month',
    badge: null,
    highlight: false,
    features: [
      'Unlimited email accounts',
      'Unlimited AI classifications',
      'Full 30-day email history',
      'Unlimited sequence steps',
      'Priority support',
      'Early access to new features',
    ],
  },
]

function PlanCard({
  plan, current, onSelectStripe, onSelectRazorpay, gatewayConfig,
}: {
  plan: typeof PLANS[0]
  current: boolean
  onSelectStripe: () => void
  onSelectRazorpay: () => void
  gatewayConfig: GatewayConfig | null
}) {
  const anyGateway = gatewayConfig?.stripeReady || gatewayConfig?.razorpayReady

  return (
    <div className={`rounded-xl border p-4 md:p-6 flex flex-col gap-5 bg-white
      ${plan.highlight ? 'border-[#0b1220] ring-1 ring-[#0b1220]' : 'border-[rgba(11,18,32,0.1)]'}`}>
      {plan.badge && (
        <span className="self-start text-[10px] font-semibold tracking-widest uppercase bg-[#0b1220] text-white px-2.5 py-1 rounded-full">
          {plan.badge}
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-[rgba(11,18,32,0.5)]">{plan.name}</p>
        <p className="text-4xl font-bold text-[#0b1220] mt-1">
          ${plan.priceUSD}<span className="text-base font-normal text-[rgba(11,18,32,0.4)]">{plan.period}</span>
        </p>
        <p className="text-xs text-[rgba(11,18,32,0.4)] mt-0.5">≈ ₹{plan.priceINR}/month</p>
      </div>
      <ul className="space-y-2.5 flex-1">
        {plan.features.map(f => (
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
      ) : !anyGateway ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Payment gateways not configured yet. Email <a href="mailto:billing@pendingly.app" className="underline">billing@pendingly.app</a> to upgrade.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {gatewayConfig?.razorpayReady && (
            <button
              onClick={onSelectRazorpay}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors
                ${plan.highlight
                  ? 'bg-[#0b1220] text-white hover:bg-[#1a2535]'
                  : 'border border-[rgba(11,18,32,0.15)] text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)]'}`}
            >
              Pay with Razorpay
            </button>
          )}
          {gatewayConfig?.stripeReady && (
            <button
              onClick={onSelectStripe}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-[rgba(11,18,32,0.15)] text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
            >
              Pay with Stripe
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function PaymentsPage() {
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [gateway, setGateway] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plan').then(r => r.json()).then(setPlan).catch(() => {})
    fetch('/api/payments/gateway-config').then(r => r.json()).then(setGatewayConfig).catch(() => {})
  }, [])

  const handleGatewaySelect = (planKey: string, gw: string) => {
    setSelectedPlan(planKey)
    setGateway(gw)
  }

  const planLabel = plan?.type === 'free' ? 'Free Trial' : plan?.type === 'lite' ? 'Pendingly Lite' : plan?.type === 'pro' ? 'Pendingly Pro' : '—'

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
      {/* Current plan banner */}
      <div className="mb-8 bg-white rounded-xl border border-[rgba(11,18,32,0.1)] p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-[rgba(11,18,32,0.06)]">
          <CreditCard className="h-5 w-5 text-[#0b1220]" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-[rgba(11,18,32,0.45)] uppercase tracking-wider">Current plan</p>
          <p className="text-lg font-bold text-[#0b1220]">{planLabel}</p>
          {plan?.type === 'free' && plan.daysLeft != null && (
            <p className="text-sm text-[rgba(11,18,32,0.5)]">{plan.daysLeft} days remaining on free trial</p>
          )}
          {plan?.expiresAt && plan.type !== 'free' && (
            <p className="text-sm text-[rgba(11,18,32,0.5)]">
              Renews {new Date(plan.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Link href="/referral"
          className="flex items-center gap-1.5 text-xs font-medium text-[#0b1220] border border-[rgba(11,18,32,0.1)] px-3 py-2 rounded-lg hover:bg-[rgba(11,18,32,0.03)] transition-colors">
          <Gift className="h-3.5 w-3.5" />
          Earn free days
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0b1220]">Upgrade your plan</h1>
        <p className="text-[rgba(11,18,32,0.5)] mt-1.5 text-sm">
          Choose a plan that works for you. Cancel or change anytime.
        </p>
      </div>

      {/* Checkout flow */}
      {selectedPlan && gateway && (
        <div className="mb-8 bg-white border border-[rgba(11,18,32,0.1)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-5 w-5 text-[#0b1220]" />
            <p className="font-semibold text-[#0b1220]">
              Completing {gateway === 'razorpay' ? 'Razorpay' : 'Stripe'} checkout for{' '}
              {PLANS.find(p => p.key === selectedPlan)?.name}
            </p>
          </div>
          <p className="text-sm text-[rgba(11,18,32,0.5)] mb-4">
            {gateway === 'razorpay'
              ? 'Razorpay checkout will open in a moment. You can pay via UPI, cards, net banking, or wallets.'
              : 'Stripe checkout will open in a moment. You can pay via card or Link.'}
          </p>
          <p className="text-xs text-[rgba(11,18,32,0.4)] bg-[rgba(11,18,32,0.03)] px-3 py-2 rounded-lg">
            Live payment integration is being activated. In the meantime, email{' '}
            <a href="mailto:billing@pendingly.app" className="underline">billing@pendingly.app</a>{' '}
            to upgrade to <strong>{PLANS.find(p => p.key === selectedPlan)?.name}</strong> — we'll activate your plan within 24h.
          </p>
          <button onClick={() => { setSelectedPlan(null); setGateway(null) }}
            className="mt-3 text-xs text-[rgba(11,18,32,0.4)] hover:text-[#0b1220]">
            Dismiss
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PLANS.map(p => (
          <PlanCard
            key={p.key}
            plan={p}
            current={plan?.type === p.key}
            gatewayConfig={gatewayConfig}
            onSelectStripe={() => handleGatewaySelect(p.key, 'stripe')}
            onSelectRazorpay={() => handleGatewaySelect(p.key, 'razorpay')}
          />
        ))}
      </div>

      {/* Referral promo */}
      <div className="mt-8 rounded-xl bg-[rgba(11,18,32,0.03)] border border-[rgba(11,18,32,0.07)] p-5">
        <div className="flex items-start gap-3">
          <Gift className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#0b1220] text-sm">Not ready to pay? Earn free time instead.</p>
            <ul className="mt-2 space-y-1 text-sm text-[rgba(11,18,32,0.6)]">
              <li>• Refer a friend → <strong>30 free days</strong> added to your plan</li>
              <li>• Share your stats → <strong>7 free days</strong> (once per day)</li>
            </ul>
            <Link href="/referral"
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#0b1220] underline underline-offset-2 hover:opacity-70">
              Go to your referral dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
