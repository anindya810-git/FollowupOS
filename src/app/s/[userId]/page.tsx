import { Metadata } from 'next'

interface Props {
  params: Promise<{ userId: string }>
}

interface PublicStats {
  name: string
  period: string
  handled: number
  replyRate: number | null
}

async function fetchStats(userId: string): Promise<PublicStats | null> {
  try {
    const base = process.env.APP_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/stats/public/${userId}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params
  const stats = await fetchStats(userId)
  if (!stats) return { title: 'Pendingly' }
  const desc = stats.replyRate != null
    ? `${stats.name} replied to ${stats.replyRate}% of emails on time in ${stats.period} using Pendingly.`
    : `${stats.name} handled ${stats.handled} emails in ${stats.period} using Pendingly.`
  return {
    title: `${stats.name} on Pendingly`,
    description: desc,
    openGraph: { title: `${stats.name} on Pendingly`, description: desc, siteName: 'Pendingly' },
    twitter: { card: 'summary', title: `${stats.name} on Pendingly`, description: desc },
  }
}

export default async function SharePage({ params }: Props) {
  const { userId } = await params
  const stats = await fetchStats(userId)

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
        <p className="text-gray-400 text-sm">Stats not found.</p>
      </div>
    )
  }

  const base = process.env.APP_BASE_URL || 'https://pendingly.app'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4] p-6">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-[rgba(11,18,32,0.08)] p-8 shadow-sm text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-[rgba(11,18,32,0.35)] uppercase mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Pendingly
          </div>

          {stats.replyRate != null && (
            <div className="mb-4">
              <p className="text-6xl font-bold text-[#0b1220] leading-none">{stats.replyRate}<span className="text-3xl">%</span></p>
              <p className="text-sm text-[rgba(11,18,32,0.5)] mt-2">reply rate this month</p>
            </div>
          )}

          <div className="mb-6">
            <p className="text-3xl font-bold text-[#0b1220]">{stats.handled}</p>
            <p className="text-sm text-[rgba(11,18,32,0.5)] mt-1">emails handled in {stats.period}</p>
          </div>

          <p className="text-sm text-[rgba(11,18,32,0.6)] mb-1">
            <span className="font-semibold text-[#0b1220]">{stats.name}</span>
          </p>
          <p className="text-xs text-[rgba(11,18,32,0.35)]">is using Pendingly to stay on top of email</p>
        </div>

        {/* Share actions */}
        <div className="mt-4 flex gap-2 justify-center">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I handled ${stats.handled} emails and replied to ${stats.replyRate ?? '?'}% on time in ${stats.period} using @pendingly 📧`)}&url=${encodeURIComponent(`${base}/s/${userId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2.5 px-4 rounded-lg bg-[#0b1220] text-white text-xs font-medium hover:bg-[#1a2535] transition-colors"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${base}/s/${userId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2.5 px-4 rounded-lg border border-[rgba(11,18,32,0.12)] text-[#0b1220] text-xs font-medium hover:bg-[rgba(11,18,32,0.04)] transition-colors"
          >
            Share on LinkedIn
          </a>
        </div>

        <p className="text-center text-xs text-[rgba(11,18,32,0.35)] mt-5">
          Try Pendingly free at{' '}
          <a href={base} className="underline underline-offset-2 hover:text-[#0b1220] transition-colors">
            pendingly.app
          </a>
        </p>
      </div>
    </div>
  )
}
