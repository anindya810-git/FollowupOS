import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignInButton } from '@/components/auth/SignInButton'
import { LogoMark } from '@/components/ui/Logo'
import {
  Inbox, Sparkles, Clock, MessageSquare, Calendar, Bell, Shield,
  ArrowRight, Check, Star, Gift, Zap, Users, BarChart3, Mail,
} from 'lucide-react'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-paper">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 bg-paper/80 backdrop-blur-md border-b border-[rgb(11_18_32/6%)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-9 flex-shrink-0" />
            <span className="text-xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[rgb(11_18_32/65%)]">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </nav>
          <SignInButton />
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgb(11_18_32/4%)] border border-[rgb(11_18_32/8%)] mb-7">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-[rgb(11_18_32/65%)]">AI-powered email follow-up — works with Gmail & Outlook</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-7">
          Never miss a follow-up<br />
          <span className="text-[rgb(11_18_32/50%)]">again.</span>
        </h1>

        <p className="text-lg md:text-xl text-[rgb(11_18_32/55%)] max-w-2xl mx-auto leading-relaxed mb-10">
          Pendingly reads your inbox with AI and tells you exactly who needs a reply,
          who owes you one, and what's overdue — every single day.
        </p>

        <div className="flex flex-col items-center gap-4">
          <SignInButton />
          <p className="text-xs text-[rgb(11_18_32/40%)]">
            3 months free · No credit card · Disconnect anytime
          </p>
        </div>

        {/* Trust strip */}
        <div className="mt-16 pt-12 border-t border-[rgb(11_18_32/8%)]">
          <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/35%)] font-semibold mb-5">
            Built for people who live in their inbox
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-[rgb(11_18_32/60%)]">
            {[
              { icon: Mail, label: 'Gmail + Outlook' },
              { icon: Shield, label: 'Read-only by default' },
              { icon: Sparkles, label: 'Bring your own AI key' },
              { icon: Bell, label: 'Daily digest' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2">
                <Icon className="h-4 w-4 text-[rgb(11_18_32/45%)]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="px-6 py-20 bg-white border-y border-[rgb(11_18_32/6%)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold mb-3">The Problem</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Important emails fall through the cracks.
            </h2>
            <p className="text-lg text-[rgb(11_18_32/55%)] max-w-2xl mx-auto">
              You read it on your phone, meant to reply later, and then it slid 200 emails down.
              Now it's been a week. Awkward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { stat: '67%', label: 'of professionals say they\'ve lost deals or opportunities from forgotten follow-ups' },
              { stat: '6 hrs', label: 'wasted per week scanning inbox for things you need to act on' },
              { stat: '3 days', label: 'is the average reply lag — by which time the moment has passed' },
            ].map(({ stat, label }) => (
              <div key={stat} className="rounded-xl border border-[rgb(11_18_32/10%)] p-6 bg-paper">
                <p className="text-4xl font-bold text-ink mb-2">{stat}</p>
                <p className="text-sm text-[rgb(11_18_32/60%)] leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/45%)] font-semibold mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Set it up in 60 seconds.</h2>
          <p className="text-lg text-[rgb(11_18_32/55%)]">Three steps. No spreadsheets. No daily journaling.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: '01', title: 'Connect your inbox', icon: Inbox,
              desc: 'One-click OAuth with Gmail or Outlook. We get read access — never send on your behalf without your say-so.',
            },
            {
              num: '02', title: 'AI reads everything', icon: Sparkles,
              desc: 'In about two minutes, our AI scans up to 30 days of threads and classifies what needs your attention.',
            },
            {
              num: '03', title: 'Work the queue', icon: Check,
              desc: 'Each morning, see exactly who to reply to, who owes you a response, and what\'s overdue. Knock them out.',
            },
          ].map(({ num, title, icon: Icon, desc }) => (
            <div key={num} className="rounded-xl bg-white border border-[rgb(11_18_32/10%)] p-7">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-mono text-[rgb(11_18_32/35%)]">{num}</span>
                <Icon className="h-5 w-5 text-[rgb(11_18_32/65%)]" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
              <p className="text-sm text-[rgb(11_18_32/60%)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 bg-white border-y border-[rgb(11_18_32/6%)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/45%)] font-semibold mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Everything you need to stay on top of email.</h2>
            <p className="text-lg text-[rgb(11_18_32/55%)] max-w-2xl mx-auto">
              Built by people who hate inbox zero theatre. This is about closing loops, not folder organisation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: MessageSquare, title: 'Smart classification',
                desc: 'AI sorts your inbox into: reply needed, waiting on them, commitments overdue, FYI noise.',
              },
              {
                icon: Sparkles, title: 'Pendingly Assist drafts',
                desc: 'One click drafts a reply in your tone — polite, direct, casual. Always your final approval.',
              },
              {
                icon: Clock, title: 'Snooze with reminders',
                desc: 'Defer non-urgent threads to a specific day. Web push wakes you when it\'s time.',
              },
              {
                icon: Bell, title: 'Auto-follow-up sequences',
                desc: 'They didn\'t reply? Send a polite nudge 3 days later — and another 7 days after that.',
              },
              {
                icon: Calendar, title: 'Calendar & task sync',
                desc: 'Action items can auto-create Google Calendar events or Tasks with a single toggle.',
              },
              {
                icon: BarChart3, title: 'Daily digest',
                desc: 'Every morning at 9am: today\'s priorities, what slipped yesterday, who you\'re waiting on.',
              },
              {
                icon: Shield, title: 'Bring your own AI key',
                desc: 'On paid plans, plug in your own Anthropic, OpenAI, or Gemini key — calls don\'t count toward quotas.',
              },
              {
                icon: Users, title: 'Noise filtering',
                desc: 'Newsletters, social notifications, promos? Auto-ignored. Ignore any sender with one click.',
              },
              {
                icon: Gift, title: 'Earn free time',
                desc: 'Refer a friend → 30 free days. Share your stats on social → 7 days. Stack them up.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-[rgb(11_18_32/10%)] p-5 bg-paper hover:border-[rgb(11_18_32/20%)] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[rgb(11_18_32/5%)] flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-ink" />
                </div>
                <h3 className="font-semibold text-ink mb-1">{title}</h3>
                <p className="text-sm text-[rgb(11_18_32/60%)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/45%)] font-semibold mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Start free for 3 months.</h2>
          <p className="text-lg text-[rgb(11_18_32/55%)] max-w-2xl mx-auto">
            Earn more free time with referrals (30 days each) and shares (7 days each).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Free */}
          <div className="rounded-xl border border-[rgb(11_18_32/10%)] bg-white p-6 flex flex-col">
            <p className="text-sm font-medium text-[rgb(11_18_32/55%)]">Free Trial</p>
            <p className="text-4xl font-bold text-ink mt-2">$0<span className="text-base font-normal text-[rgb(11_18_32/40%)]"> / 3 months</span></p>
            <ul className="space-y-2.5 my-6 flex-1">
              {[
                '1 email account',
                '1,000 AI classifications / month',
                'Last 3 days of email analysed',
                'Reply, snooze, done, ignore actions',
                'Referral & share bonuses',
              ].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[rgb(11_18_32/70%)]">
                  <Check className="h-4 w-4 text-ink flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <SignInButton />
          </div>

          {/* Lite — highlighted */}
          <div className="rounded-xl border-2 border-ink bg-white p-6 flex flex-col relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-widest uppercase bg-ink text-white px-2.5 py-1 rounded-full">
              Most Popular
            </span>
            <p className="text-sm font-medium text-[rgb(11_18_32/55%)]">Pendingly Lite</p>
            <p className="text-4xl font-bold text-ink mt-2">$9<span className="text-base font-normal text-[rgb(11_18_32/40%)]"> / month</span></p>
            <ul className="space-y-2.5 my-6 flex-1">
              {[
                'Everything in Free',
                'Up to 3 email accounts',
                '5,000 AI classifications / month',
                'Bring your own AI API key',
                'Last 7 days of email analysed',
                'Follow-up sequences (3 steps)',
                'Calendar & task auto-create',
                'Remove "Sent via Pendingly" footer',
              ].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[rgb(11_18_32/70%)]">
                  <Check className="h-4 w-4 text-ink flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <SignInButton />
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-[rgb(11_18_32/10%)] bg-white p-6 flex flex-col">
            <p className="text-sm font-medium text-[rgb(11_18_32/55%)]">Pendingly Pro</p>
            <p className="text-4xl font-bold text-ink mt-2">$15<span className="text-base font-normal text-[rgb(11_18_32/40%)]"> / month</span></p>
            <ul className="space-y-2.5 my-6 flex-1">
              {[
                'Everything in Lite',
                'Unlimited email accounts',
                'Unlimited AI classifications',
                'Full 30-day email history',
                'Unlimited sequence steps',
                'Priority support',
                'Early access to new features',
              ].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[rgb(11_18_32/70%)]">
                  <Check className="h-4 w-4 text-ink flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <SignInButton />
          </div>
        </div>

        {/* Referral promo strip */}
        <div className="mt-10 rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Earn more free time.</strong> Refer a friend → get 30 free days added to whatever plan you're on.
            Share your weekly stats on X / LinkedIn → 7 free days (once per day). Stack as many as you can.
          </div>
        </div>
      </section>

      {/* Social proof / quote */}
      <section className="px-6 py-20 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[rgb(255_255_255/45%)] font-semibold mb-5">Why Pendingly</p>
          <p className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
            "Inbox zero is a vanity metric. <span className="text-[rgb(255_255_255/55%)]">Closing loops is the actual job.</span>
            Pendingly is built for the second one."
          </p>
          <p className="text-sm text-[rgb(255_255_255/45%)]">— The Pendingly philosophy</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/45%)] font-semibold mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-ink">Common questions</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'Will you send emails on my behalf?',
              a: 'Only when you explicitly hit "Send" on a draft. The classification scan is fully read-only. You can use Pendingly entirely as a queue dashboard and reply from your normal inbox if you prefer.',
            },
            {
              q: 'Is my email data safe?',
              a: 'We store only the bare minimum needed — thread metadata, short snippets, sender info. Bodies are excerpted, not archived. All tokens and API keys are encrypted with AES-256-GCM at rest. You can disconnect and delete everything in one click from Settings.',
            },
            {
              q: 'Which AI model do you use?',
              a: 'By default, Pendingly uses our managed AI provider (currently Claude). On the Lite and Pro plans you can bring your own API key — Anthropic, OpenAI, or Google Gemini — and those calls don\'t count toward your quota.',
            },
            {
              q: 'Does it work with Outlook?',
              a: 'Yes. Gmail and Outlook are both fully supported. IMAP for other providers is on the roadmap.',
            },
            {
              q: 'What happens after my 3-month free trial?',
              a: 'You can upgrade to Lite ($9/mo) or Pro ($15/mo), or earn more free time through referrals (30 days each) and stat shares (7 days each). No card is required to start.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Cancel from your Settings page — no calls, no forms. You keep access until the end of your current billing period.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-[rgb(11_18_32/10%)] bg-white p-5">
              <summary className="font-semibold text-ink cursor-pointer flex items-center justify-between list-none">
                {q}
                <ArrowRight className="h-4 w-4 text-[rgb(11_18_32/40%)] group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-[rgb(11_18_32/60%)] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 bg-paper border-t border-[rgb(11_18_32/8%)]">
        <div className="max-w-2xl mx-auto text-center">
          <Zap className="h-10 w-10 text-ink mx-auto mb-5" />
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
            Stop losing follow-ups.
          </h2>
          <p className="text-lg text-[rgb(11_18_32/55%)] mb-8">
            Free for 3 months. Set up in under a minute. No credit card.
          </p>
          <SignInButton />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <LogoMark className="h-8 w-9 flex-shrink-0" variant="reversed" />
                <span className="text-xl font-semibold tracking-[-0.02em]">Pendingly</span>
              </div>
              <p className="text-sm text-[rgb(255_255_255/45%)] leading-relaxed">
                Your follow-up radar.
                Built for people who live in their inbox.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(255_255_255/45%)] mb-3">Product</p>
              <ul className="space-y-2 text-sm text-[rgb(255_255_255/70%)]">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#how" className="hover:text-white">How it works</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(255_255_255/45%)] mb-3">Company</p>
              <ul className="space-y-2 text-sm text-[rgb(255_255_255/70%)]">
                <li><a href="mailto:hello@pendingly.app" className="hover:text-white">Contact</a></li>
                <li><a href="mailto:billing@pendingly.app" className="hover:text-white">Billing support</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(255_255_255/45%)] mb-3">Get started</p>
              <SignInButton />
            </div>
          </div>
          <div className="pt-8 border-t border-[rgb(255_255_255/10%)] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[rgb(255_255_255/40%)]">
            <p>© {new Date().getFullYear()} Pendingly. All rights reserved.</p>
            <p>Made for people who close loops, not folders.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
