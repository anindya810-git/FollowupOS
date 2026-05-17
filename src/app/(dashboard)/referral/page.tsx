'use client'
import { useState, useEffect } from 'react'
import { Copy, Check, Gift, Users, Calendar } from 'lucide-react'

interface ReferralInfo {
  referralCode: string
  referralUrl: string
  totalReferrals: number
  totalDaysEarned: number
  referrals: { daysAwarded: number; createdAt: string }[]
}

interface PlanInfo {
  type: string
  daysLeft: number | null
  expiresAt: string | null
}

export default function ReferralPage() {
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/referral').then(r => r.json()),
      fetch('/api/plan').then(r => r.json()),
    ]).then(([ref, pl]) => {
      setInfo(ref)
      setPlan(pl)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const copyUrl = () => {
    if (!info?.referralUrl) return
    navigator.clipboard.writeText(info.referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b1220]" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0b1220]">Referral program</h1>
        <p className="text-sm text-[rgba(11,18,32,0.5)] mt-1">
          Share Pendingly — every person who signs up with your link adds 30 days to your plan.
        </p>
      </div>

      {/* Your link */}
      <div className="bg-white border border-[rgba(11,18,32,0.1)] rounded-xl p-6 mb-5">
        <p className="text-xs font-semibold text-[rgba(11,18,32,0.4)] uppercase tracking-wider mb-3">Your referral link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-[rgba(11,18,32,0.04)] rounded-lg px-3 py-2.5 text-[#0b1220] truncate font-mono border border-[rgba(11,18,32,0.08)]">
            {info?.referralUrl ?? '—'}
          </code>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2535] transition-colors flex-shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {info?.referralUrl && (
            <>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use Pendingly to stay on top of email. Get started free → ${info.referralUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                Share on X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(info.referralUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                Share on LinkedIn
              </a>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-[rgba(11,18,32,0.1)] rounded-xl p-4 text-center">
          <Users className="h-4 w-4 text-[rgba(11,18,32,0.35)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[#0b1220]">{info?.totalReferrals ?? 0}</p>
          <p className="text-xs text-[rgba(11,18,32,0.45)] mt-0.5">referrals</p>
        </div>
        <div className="bg-white border border-[rgba(11,18,32,0.1)] rounded-xl p-4 text-center">
          <Gift className="h-4 w-4 text-[rgba(11,18,32,0.35)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[#0b1220]">{info?.totalDaysEarned ?? 0}</p>
          <p className="text-xs text-[rgba(11,18,32,0.45)] mt-0.5">days earned</p>
        </div>
        <div className="bg-white border border-[rgba(11,18,32,0.1)] rounded-xl p-4 text-center">
          <Calendar className="h-4 w-4 text-[rgba(11,18,32,0.35)] mx-auto mb-2" />
          <p className="text-2xl font-bold text-[#0b1220]">{plan?.daysLeft ?? '∞'}</p>
          <p className="text-xs text-[rgba(11,18,32,0.45)] mt-0.5">days left</p>
        </div>
      </div>

      {/* Referral history */}
      {(info?.referrals?.length ?? 0) > 0 && (
        <div className="bg-white border border-[rgba(11,18,32,0.1)] rounded-xl p-5">
          <p className="text-xs font-semibold text-[rgba(11,18,32,0.4)] uppercase tracking-wider mb-3">History</p>
          <ul className="space-y-2">
            {info!.referrals.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-[rgba(11,18,32,0.6)]">
                  {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="font-medium text-[#0b1220]">+{r.daysAwarded} days</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How it works */}
      <div className="mt-5 rounded-xl bg-[rgba(11,18,32,0.03)] border border-[rgba(11,18,32,0.07)] p-5">
        <p className="text-xs font-semibold text-[rgba(11,18,32,0.4)] uppercase tracking-wider mb-3">How it works</p>
        <ol className="space-y-2 text-sm text-[rgba(11,18,32,0.6)]">
          <li><span className="font-semibold text-[#0b1220]">1.</span> Share your link with a colleague or friend.</li>
          <li><span className="font-semibold text-[#0b1220]">2.</span> They sign up and start using Pendingly.</li>
          <li><span className="font-semibold text-[#0b1220]">3.</span> You automatically get <strong className="text-[#0b1220]">30 free days</strong> added to your current plan.</li>
        </ol>
        <p className="text-xs text-[rgba(11,18,32,0.35)] mt-3">No limit on referrals. Bonuses stack on top of your current expiry.</p>
      </div>
    </div>
  )
}
