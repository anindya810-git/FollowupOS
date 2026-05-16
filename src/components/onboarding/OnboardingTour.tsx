'use client'
import { useState } from 'react'
import { LogoMark } from '@/components/ui/Logo'
import { Mail, Search, CheckCircle, BarChart2, Bell, ChevronRight, X } from 'lucide-react'

interface Step {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  cta?: string
}

const STEPS: Step[] = [
  {
    icon: LogoMark as React.ComponentType<{ className?: string }>,
    title: 'Welcome to Pendingly',
    body: 'You connected your inbox. Now Pendingly reads your last 30 days of email with AI and surfaces what needs follow-up — so nothing slips through.',
  },
  {
    icon: Search,
    title: 'How the scan works',
    body: 'Every thread gets one of six labels: Reply Needed, Waiting on Them, Follow-up Due, Commitment, Overdue, or No Action. We only show you the ones you actually need to act on.',
  },
  {
    icon: CheckCircle,
    title: 'Three buttons, every item',
    body: 'Done marks it complete. Snooze pushes it to a smart default time (Tomorrow 9am, Next Monday). Ignore tells Pendingly this kind of email is noise — we learn from that.',
  },
  {
    icon: Mail,
    title: 'Reply without leaving',
    body: 'Open any item and generate a draft reply in your tone of choice (Polite, Firm, Short, Executive). Send it directly from Pendingly — we mark it Done automatically.',
  },
  {
    icon: BarChart2,
    title: 'Watch your health score',
    body: 'The Analytics tab tracks your turnaround time, resolution rate, and overdue trend. Most users go from 30+ open items to under 10 within two weeks.',
  },
  {
    icon: Bell,
    title: 'Daily nudges (optional)',
    body: 'Turn on notifications in Settings to get a morning push (or Slack message) with your top priorities. Or set up auto follow-ups for people who go quiet.',
    cta: 'Get started',
  },
]

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  const finish = async () => {
    await fetch('/api/onboarding/complete', { method: 'POST' })
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-up relative">
        <button
          onClick={finish}
          className="absolute top-4 right-4 text-mute hover:text-ink"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-paper-2 mb-5">
          <Icon className="h-6 w-6 text-action" />
        </div>

        <h2 className="text-xl font-semibold text-ink tracking-tight mb-2">{current.title}</h2>
        <p className="text-sm text-mute leading-relaxed mb-8">{current.body}</p>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${
                i === step ? 'w-6 bg-ink' : i < step ? 'w-1.5 bg-ink/40' : 'w-1.5 bg-rule'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-sm text-mute hover:text-ink transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="flex items-center gap-1.5 bg-ink text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a2540] transition-colors"
          >
            {isLast ? (current.cta ?? 'Finish') : 'Next'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
