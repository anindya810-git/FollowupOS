'use client'
import { useState, useEffect } from 'react'
import { Copy, Check, Gift, Users, Calendar } from 'lucide-react'
import { PendinglyLoader } from '@/components/ui/PendinglyLoader'

const IconX = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.622 5.905-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
)
const IconLinkedIn = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
)
const IconFacebook = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
)
const IconInstagram = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
)
const IconSnapchat = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C8.396 0 5.48 2.895 5.48 6.49c0 .42.043.83.12 1.226l-.07.038c-.427.22-.91.31-1.395.257-.07-.007-.14-.01-.21-.01-.602 0-1.14.392-1.32.97a1.38 1.38 0 0 0 .93 1.712c.376.107.76.187 1.148.24.07.01.12.07.134.14.17.83.616 1.58 1.27 2.12-.44.26-.9.45-1.38.57-.22.055-.38.245-.39.474a.49.49 0 0 0 .38.5c1.12.245 2.17 1.01 2.87 2.11.1.16.27.25.45.25.1 0 .2-.03.29-.08.6-.35 1.27-.53 1.96-.53.46 0 .91.08 1.34.23.04.015.08.02.12.02.28 0 .52-.18.6-.45.13-.43.54-.73 1-.73s.87.3 1 .73c.08.27.32.45.6.45.04 0 .08-.005.12-.02.43-.15.88-.23 1.34-.23.69 0 1.36.18 1.96.53.09.05.19.08.29.08.18 0 .35-.09.45-.25.7-1.1 1.75-1.865 2.87-2.11a.49.49 0 0 0 .38-.5c-.01-.229-.17-.419-.39-.474-.48-.12-.94-.31-1.38-.57.654-.54 1.1-1.29 1.27-2.12.014-.07.064-.13.134-.14.388-.053.772-.133 1.148-.24a1.38 1.38 0 0 0 .93-1.712 1.374 1.374 0 0 0-1.32-.97c-.07 0-.14.003-.21.01-.485.053-.968-.037-1.395-.257l-.07-.038c.077-.396.12-.806.12-1.226C18.554 2.895 15.638 0 12.017 0z"/></svg>
)
const IconWhatsApp = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
)

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
    return <div className="flex items-center justify-center min-h-[40vh]"><PendinglyLoader size={48} /></div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
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
          <div className="mt-4 flex gap-2.5 flex-wrap">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use Pendingly to stay on top of email. Get started free → ${info.referralUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              title="Share on X"
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-black text-white hover:opacity-85 transition-opacity"
            >
              <IconX />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(info.referralUrl)}`}
              target="_blank" rel="noopener noreferrer"
              title="Share on LinkedIn"
              className="flex items-center justify-center w-11 h-11 rounded-xl text-white hover:opacity-85 transition-opacity"
              style={{ backgroundColor: '#0A66C2' }}
            >
              <IconLinkedIn />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(info.referralUrl)}`}
              target="_blank" rel="noopener noreferrer"
              title="Share on Facebook"
              className="flex items-center justify-center w-11 h-11 rounded-xl text-white hover:opacity-85 transition-opacity"
              style={{ backgroundColor: '#1877F2' }}
            >
              <IconFacebook />
            </a>
            <button
              onClick={() => copyForPlatform('instagram')}
              title="Copy link for Instagram"
              className="flex items-center justify-center w-11 h-11 rounded-xl text-white hover:opacity-85 transition-opacity"
              style={{ background: copiedPlatform === 'instagram' ? '#22c55e' : 'linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)' }}
            >
              {copiedPlatform === 'instagram' ? <Check className="h-5 w-5" /> : <IconInstagram />}
            </button>
            <button
              onClick={() => copyForPlatform('snapchat')}
              title="Copy link for Snapchat"
              className="flex items-center justify-center w-11 h-11 rounded-xl hover:opacity-85 transition-opacity"
              style={{ backgroundColor: copiedPlatform === 'snapchat' ? '#22c55e' : '#FFFC00', color: copiedPlatform === 'snapchat' ? 'white' : '#1a1a1a' }}
            >
              {copiedPlatform === 'snapchat' ? <Check className="h-5 w-5" style={{ color: 'white' }} /> : <IconSnapchat />}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`I use Pendingly to stay on top of email. Get started free → ${info.referralUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              title="Share on WhatsApp"
              className="flex items-center justify-center w-11 h-11 rounded-xl text-white hover:opacity-85 transition-opacity"
              style={{ backgroundColor: '#25D366' }}
            >
              <IconWhatsApp />
            </a>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
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
