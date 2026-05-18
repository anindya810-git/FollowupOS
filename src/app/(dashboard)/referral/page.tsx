'use client'
import { useState, useEffect } from 'react'
import { Copy, Check, Gift, Users, Calendar, Facebook, Instagram, Linkedin } from 'lucide-react'

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
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null)
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

  const copyForPlatform = (platform: string) => {
    if (!info?.referralUrl) return
    navigator.clipboard.writeText(info.referralUrl).then(() => {
      setCopiedPlatform(platform)
      setTimeout(() => setCopiedPlatform(null), 2000)
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
        {info?.referralUrl && (
          <div className="mt-3 space-y-2">
            {/* Row 1: X, LinkedIn, Facebook */}
            <div className="flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use Pendingly to stay on top of email. Get started free → ${info.referralUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.622 5.905-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(info.referralUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(info.referralUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </a>
            </div>
            {/* Row 2: Instagram, Snapchat — copy to clipboard */}
            <div className="flex gap-2">
              <button
                onClick={() => copyForPlatform('instagram')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                {copiedPlatform === 'instagram' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Instagram className="h-3.5 w-3.5" />}
                {copiedPlatform === 'instagram' ? 'Copied!' : 'Instagram'}
              </button>
              <button
                onClick={() => copyForPlatform('snapchat')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                {copiedPlatform === 'snapchat' ? <Check className="h-3.5 w-3.5 text-green-600" /> : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.206 1c-3.03 0-5.8 1.986-5.8 5.56v.75c0 .27-.046.54-.14.8l-.81 2.13c-.09.22-.3.35-.52.33-.36-.04-.73-.09-1.09-.16-.39-.08-.74.22-.74.63 0 .31.22.58.53.64.97.19 1.97.29 2.97.3.16 0 .3.11.34.27.3 1.27 1.55 2.2 2.97 2.2s2.67-.93 2.97-2.2c.04-.16.18-.27.34-.27 1 0 2-.1 2.97-.3.31-.06.53-.33.53-.64 0-.41-.35-.71-.74-.63-.36.07-.73.12-1.09.16-.22.02-.43-.11-.52-.33l-.81-2.13a2.12 2.12 0 0 1-.14-.8v-.75c0-3.574-2.77-5.56-5.8-5.56z"/></svg>
                )}
                {copiedPlatform === 'snapchat' ? 'Copied!' : 'Snapchat'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I use Pendingly to stay on top of email. Get started free → ${info.referralUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(11,18,32,0.12)] text-xs font-medium text-[#0b1220] hover:bg-[rgba(11,18,32,0.04)] transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>
        )}
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
