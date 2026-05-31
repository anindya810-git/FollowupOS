import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { SignInButton } from '@/components/auth/SignInButton'
import { LogoMark } from '@/components/ui/Logo'
import {
  Inbox, Sparkles, Clock, MessageSquare, Calendar, Bell, Shield,
  ArrowRight, Check, Star, Users, BarChart3, Mail, Send,
  Eye, Pause, RotateCcw, Lock, KeyRound, Trash2, ServerOff, CheckCheck,
  HeartPulse, CalendarClock,
} from 'lucide-react'

const SITE_URL = 'https://pendingly.com'

export const metadata: Metadata = {
  title: 'Pendingly — AI Email Follow-Up Reminder & Relationship Tracker',
  description:
    'Never miss a follow-up email again. Pendingly tracks unanswered emails, reminds you when to follow up, shows who owes you a reply, and alerts you when relationships cool — all without auto-sending anything. Works with Gmail, Outlook & IMAP.',
  keywords: [
    'email follow-up reminder',
    'never miss a follow-up email',
    'unanswered email tracker',
    'automatic email follow-up tool',
    'AI email assistant',
    'email response tracker',
    'follow up on emails',
    'email relationship management',
    'inbox follow-up organizer',
    'Gmail follow-up reminder',
    'Outlook follow-up reminder',
    'email productivity tool',
    'relationship health email',
    'who needs a reply inbox',
    'follow up email tool',
    'email accountability',
    'lost deal follow-up',
    'sales follow-up email reminder',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'Pendingly — AI Email Follow-Up Reminder & Relationship Tracker',
    description:
      'Stop losing deals and relationships to forgotten emails. Pendingly shows you who needs a reply, who owes you one, and which contacts are going cold — with full control over everything that sends.',
    url: SITE_URL,
    siteName: 'Pendingly',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pendingly — Never miss a follow-up email again',
    description:
      'AI-powered email follow-up tracker. See who needs a reply, who owes you one, and which relationships are cooling. Works with Gmail, Outlook & IMAP.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Pendingly',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Pendingly is an AI email follow-up reminder and relationship tracker. It scans your Gmail, Outlook, or IMAP inbox and surfaces who needs a reply, who owes you one, and which relationships are going cold — helping you never miss a follow-up email again.',
      featureList: [
        'Email follow-up reminders',
        'Unanswered email tracker',
        'Relationship health monitoring',
        'AI email triage and classification',
        'Automatic follow-up sequences with approval mode',
        'VIP contact detection',
        'Reply deadline reminders',
        'Snooze and scheduled send',
        'Gmail, Outlook, and IMAP integration',
        'WatchList for important threads and contacts',
      ].join(', '),
      offers: [
        { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free Trial — 3 months' },
        { '@type': 'Offer', price: '9', priceCurrency: 'USD', name: 'Pendingly Lite', billingPeriod: 'P1M' },
        { '@type': 'Offer', price: '15', priceCurrency: 'USD', name: 'Pendingly Pro', billingPeriod: 'P1M' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I track email follow-ups automatically?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pendingly connects to your Gmail or Outlook inbox (read-only OAuth) and automatically identifies threads where a reply is overdue, you\'re waiting on someone else, or a follow-up commitment is due. It surfaces these daily so you never manually hunt for forgotten emails again.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will Pendingly send emails on my behalf?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Only when you choose to. The classification scan is fully read-only. Replies send only when you hit send, and follow-up sequences can be set to "approval mode," where every message waits for a one-tap approval. Every send also has a 10-second undo window.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is my email data protected?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We store only what we need — thread metadata, short snippets and sender info; bodies are excerpted, not archived. OAuth tokens and AI keys are encrypted with AES-256-GCM at rest. Every database query is scoped to your account. We never sell data or train on your email.',
          },
        },
        {
          '@type': 'Question',
          name: 'What email clients does Pendingly support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pendingly works with Gmail, Outlook, Zoho Mail, Apple Mail, and any standard IMAP account. You can connect multiple inboxes on paid plans and filter your follow-up queue to any combination.',
          },
        },
        {
          '@type': 'Question',
          name: 'What relationship data does Pendingly use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pendingly analyses the timing of messages you\'ve already exchanged to estimate your typical reply speed per contact — powering relationship health, VIP detection, and "cooling" alerts. It\'s computed from metadata you already have; nothing is shared or sold.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which AI model does Pendingly use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'By default a Pendingly-managed provider. On Lite and Pro plans you can bring your own Anthropic, OpenAI or Gemini API key, so classification runs under your own provider agreement. We don\'t train models on your email.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens after the free trial?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Upgrade to Lite ($9/mo) or Pro ($15/mo), or earn more free time via referrals (30 days each) and stat shares (7 days each). No credit card to start. Cancel anytime from Settings — you keep access until the end of the period, and you can delete all your data in one click.',
          },
        },
      ],
    },
  ],
}

// ── Feature groups ───────────────────────────────────────────────────────────
const FEATURE_GROUPS = [
  {
    kicker: 'Triage & focus',
    title: 'See exactly what needs you — and nothing else',
    items: [
      { icon: MessageSquare, title: 'Smart classification', desc: 'Every thread sorted into reply-needed, waiting-on-them, follow-up-due, and overdue commitments. Newsletters and noise filtered out automatically.' },
      { icon: Sparkles, title: 'AI thread summary', desc: 'Open any item and get a 3-sentence recap of the whole conversation — what it’s about, what’s decided, what’s outstanding.' },
      { icon: BarChart3, title: 'Daily digest & analytics', desc: 'A morning brief of today’s priorities and what slipped — by email, Slack, Teams or WhatsApp. Track reply time and resolution trends.' },
      { icon: Bell, title: 'Reply-deadline reminders', desc: 'When you promise “I’ll get back to you Friday,” Pendingly spots it and reminds you before you break your word.' },
    ],
  },
  {
    kicker: 'Trust & control',
    title: 'Automation you can actually trust',
    items: [
      { icon: CheckCheck, title: 'Approval mode', desc: 'Nothing auto-sends. Every follow-up is drafted and waits for a single tap of approval. The #1 fear of follow-up tools, removed.' },
      { icon: RotateCcw, title: '10-second undo', desc: 'Every send has a grace window — hit undo and it never goes out. No more “sent too soon” cringe.' },
      { icon: Pause, title: 'Pause everything', desc: 'Going on holiday? One tap halts all nudges, sequences and digests. Resume when you’re back. Scans keep running quietly.' },
      { icon: Trash2, title: '“Drop it” suggestions', desc: 'Pendingly flags genuinely dead threads so you can let them go — guilt-free. It isn’t just here to nag you.' },
    ],
  },
  {
    kicker: 'Relationships',
    title: 'A radar for the people who matter',
    items: [
      { icon: HeartPulse, title: 'Relationship health', desc: '“You usually reply to Rahul in a day — it’s been eight. Cooling.” Learned from your real reply patterns, per contact.' },
      { icon: Star, title: 'VIP auto-detection', desc: 'Pendingly learns who matters from how often you engage and how fast you reply — and quietly prioritises them. No manual lists.' },
      { icon: Eye, title: 'WatchList', desc: 'Watch a thread, a person, or a whole domain and get a push the moment anything new lands — on top of the urgent items.' },
      { icon: CalendarClock, title: 'Reconnect nudges', desc: '“It’s been a year since you closed the deal with Acme — good time to check in.” Pure relationship-building.' },
    ],
  },
  {
    kicker: 'Automation & reach',
    title: 'Close loops without lifting a finger',
    items: [
      { icon: Send, title: 'Follow-up sequences', desc: 'No reply? Send a polite nudge after 3 days, another after 7 — multi-step sequences in your tone. Or keep them in approval mode.' },
      { icon: Calendar, title: 'Calendar & meeting drafts', desc: 'Turn an action item into a Google/Outlook event with a Meet, Teams or Zoom link. After a meeting ends, get a “next steps” recap drafted for you.' },
      { icon: Clock, title: 'Snooze & scheduled send', desc: 'Defer a thread to a specific day, or write now and send later — landing at exactly the right moment.' },
      { icon: Inbox, title: 'Every inbox, in one place', desc: 'Gmail, Outlook, Zoho, Apple Mail or any IMAP. Connect multiple accounts and filter the queue to any of them.' },
    ],
  },
]

const SECURITY_POINTS = [
  { icon: Lock, title: 'Encrypted at rest', desc: 'OAuth tokens, mailbox passwords and your AI keys are sealed with AES-256-GCM. Encryption keys never leave the server.' },
  { icon: ServerOff, title: 'Read-only by default', desc: 'The scan only reads. Nothing is ever sent without your explicit action — and approval mode adds a second gate.' },
  { icon: Users, title: 'Strict tenant isolation', desc: 'Every query is scoped to your account at the database layer. One user can never reach another’s data.' },
  { icon: Shield, title: 'Hardened delivery', desc: 'Strict Content-Security-Policy, HSTS, frame-deny and locked-down headers. No client source maps, no secrets in the browser.' },
  { icon: KeyRound, title: 'Bring your own AI key', desc: 'Route classification through your own Anthropic, OpenAI or Gemini account — your data, your provider agreement.' },
  { icon: Trash2, title: 'You own your data', desc: 'Disconnect an inbox to revoke access instantly. Delete your account and everything is purged. We never sell data or train on your email.' },
]

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 bg-paper/80 backdrop-blur-md border-b border-[rgb(11_18_32/6%)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark className="h-10 w-11 flex-shrink-0" />
            <span className="text-2xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[rgb(11_18_32/65%)]">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#security" className="hover:text-ink transition-colors">Security</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </nav>
          <SignInButton />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(242_90_60/5%)] via-paper to-paper" />
        <div className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[rgb(11_18_32/10%)] shadow-sm mb-7">
            <Sparkles className="h-3.5 w-3.5 text-action" />
            <span className="text-xs font-medium text-[rgb(11_18_32/65%)]">AI email follow-up reminder · Gmail, Outlook & IMAP</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-7">
            Never miss a follow-up email<br />
            <span className="text-[rgb(11_18_32/45%)]">or let a relationship go cold.</span>
          </h1>

          <p className="text-lg md:text-xl text-[rgb(11_18_32/55%)] max-w-2xl mx-auto leading-relaxed mb-10">
            Pendingly scans your inbox and surfaces who needs a reply, who owes you one, and which
            relationships are cooling — so you follow up before the moment passes, not after it's gone.
          </p>

          <div className="flex flex-col items-center gap-4">
            <SignInButton />
            <p className="text-xs text-[rgb(11_18_32/40%)]">
              3 months free · No credit card · Disconnect anytime
            </p>
          </div>

          {/* Trust strip */}
          <div className="mt-16 pt-12 border-t border-[rgb(11_18_32/8%)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-[rgb(11_18_32/60%)]">
              {[
                { icon: Mail, label: 'Gmail · Outlook · IMAP' },
                { icon: ServerOff, label: 'Read-only by default' },
                { icon: CheckCheck, label: 'Nothing sends without you' },
                { icon: Lock, label: 'AES-256 encrypted' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4 text-[rgb(11_18_32/45%)]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="px-6 py-20 bg-white border-y border-[rgb(11_18_32/6%)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-action font-semibold mb-3">The problem</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Deals die in the emails you meant to follow up on.
            </h2>
            <p className="text-lg text-[rgb(11_18_32/55%)] max-w-2xl mx-auto">
              You read it on your phone, meant to reply later, and it slid 200 emails down.
              A week passes. The deal goes quiet. The relationship cools.
              No tool reminded you — until now.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { stat: '67%', label: 'of professionals say they’ve lost deals or opportunities to forgotten follow-ups' },
              { stat: '6 hrs', label: 'wasted each week scanning the inbox for things that actually need action' },
              { stat: '3 days', label: 'average reply lag — by which point the moment, and the goodwill, has passed' },
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
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Your email follow-up tracker, live in 60 seconds.</h2>
          <p className="text-lg text-[rgb(11_18_32/55%)]">Connect your inbox, let it scan, work the follow-up queue. No spreadsheets, no reminders app, no journaling.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { num: '01', title: 'Connect your inbox', icon: Inbox, desc: 'One-click OAuth with Gmail or Outlook (or any IMAP). The scan is read-only — we never send on your behalf without you.' },
            { num: '02', title: 'Pendingly reads everything', icon: Sparkles, desc: 'In about two minutes it scans your recent threads, filters the noise, and classifies what genuinely needs you.' },
            { num: '03', title: 'Work the queue', icon: Check, desc: 'Each morning: who to reply to, who owes you, what’s overdue, and which relationships are cooling. Knock them out.' },
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

      {/* Features — grouped */}
      <section id="features" className="px-6 py-24 bg-white border-y border-[rgb(11_18_32/6%)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/45%)] font-semibold mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Every follow-up tool you need — none of the noise.</h2>
            <p className="text-lg text-[rgb(11_18_32/55%)] max-w-2xl mx-auto">
              Track unanswered emails, automate follow-up sequences, and keep your most important relationships warm — all from one inbox view.
            </p>
          </div>

          <div className="space-y-16">
            {FEATURE_GROUPS.map(group => (
              <div key={group.kicker}>
                <div className="mb-6 max-w-2xl">
                  <p className="text-xs uppercase tracking-widest text-action font-semibold mb-2">{group.kicker}</p>
                  <h3 className="text-2xl font-bold text-ink">{group.title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {group.items.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="rounded-xl border border-[rgb(11_18_32/10%)] p-5 bg-paper hover:border-[rgb(11_18_32/22%)] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-[rgb(11_18_32/5%)] flex items-center justify-center mb-3">
                        <Icon className="h-5 w-5 text-ink" />
                      </div>
                      <h4 className="font-semibold text-ink mb-1">{title}</h4>
                      <p className="text-sm text-[rgb(11_18_32/60%)] leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security — for corporates */}
      <section id="security" className="px-6 py-24 bg-ink text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgb(255_255_255/8%)] border border-[rgb(255_255_255/12%)] mb-5">
              <Shield className="h-3.5 w-3.5 text-[rgb(255_255_255/70%)]" />
              <span className="text-xs font-medium text-[rgb(255_255_255/70%)]">Security &amp; privacy</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-grade security for your most sensitive data — your inbox.</h2>
            <p className="text-lg text-[rgb(255_255_255/55%)] max-w-2xl mx-auto">
              Your inbox is your most sensitive data. We treat it that way — with security built in from the database to the browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECURITY_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-[rgb(255_255_255/10%)] bg-[rgb(255_255_255/4%)] p-6">
                <Icon className="h-5 w-5 text-[rgb(255_255_255/70%)] mb-3" />
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-[rgb(255_255_255/55%)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-[rgb(255_255_255/12%)] bg-[rgb(255_255_255/4%)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Rolling Pendingly out to a team?</p>
              <p className="text-sm text-[rgb(255_255_255/55%)] mt-1">
                We support data-processing agreements, security reviews, and centralised billing. Tell us what your security team needs.
              </p>
            </div>
            <a href="mailto:sales@pendingly.com" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white text-ink px-4 py-2.5 text-sm font-semibold hover:bg-[rgb(255_255_255/90%)] transition-colors">
              Talk to us <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/45%)] font-semibold mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Start free for 3 months.</h2>
          <p className="text-lg text-[rgb(11_18_32/55%)] max-w-2xl mx-auto">
            Earn more free time with referrals (30 days each) and stat shares (7 days each).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Free */}
          <div className="rounded-xl border border-[rgb(11_18_32/10%)] bg-white p-6 flex flex-col">
            <p className="text-sm font-medium text-[rgb(11_18_32/55%)]">Free Trial</p>
            <p className="text-4xl font-bold text-ink mt-2">$0<span className="text-base font-normal text-[rgb(11_18_32/40%)]"> / 3 months</span></p>
            <ul className="space-y-2.5 my-6 flex-1">
              {['1 email account', '1,000 AI classifications / month', 'Last 3 days of email analysed', 'Reply, snooze, done, ignore, watch', 'Relationship health & VIP detection', 'Referral & share bonuses'].map(f => (
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
              {['Everything in Free', 'Up to 3 email accounts', '5,000 AI classifications / month', 'Bring your own AI API key', 'Last 7 days of email analysed', 'Follow-up sequences + approval mode', 'Calendar, meeting drafts & WatchList', 'Remove “Sent via Pendingly” footer'].map(f => (
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
              {['Everything in Lite', 'Unlimited email accounts', 'Unlimited AI classifications', 'Full 30-day email history', 'Unlimited sequence steps', 'Priority support', 'Early access to new features'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[rgb(11_18_32/70%)]">
                  <Check className="h-4 w-4 text-ink flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <SignInButton />
          </div>
        </div>

        {/* Enterprise + referral strips */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-[rgb(11_18_32/4%)] border border-[rgb(11_18_32/10%)] p-5 flex items-start gap-3">
            <Shield className="h-5 w-5 text-ink flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[rgb(11_18_32/70%)]">
              <strong className="text-ink">For teams.</strong> Volume pricing, a Data Processing Agreement, and security-review support.{' '}
              <a href="mailto:sales@pendingly.com" className="text-action underline">Contact sales</a>.
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
            <Star className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>Earn free time.</strong> Refer a friend → 30 days. Share your weekly stats → 7 days. Stack as many as you can.
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy quote */}
      <section className="px-6 py-20 bg-white border-y border-[rgb(11_18_32/6%)]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[rgb(11_18_32/40%)] font-semibold mb-5">Why Pendingly</p>
          <p className="text-2xl md:text-3xl font-medium leading-relaxed text-ink mb-8">
            “Inbox zero is a vanity metric. <span className="text-[rgb(11_18_32/45%)]">Closing loops and keeping relationships warm is the actual job.</span>
            Pendingly is built for the second one.”
          </p>
          <p className="text-sm text-[rgb(11_18_32/45%)]">— The Pendingly philosophy</p>
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
            { q: "How do I automatically track email follow-ups?", a: "Pendingly connects to your Gmail or Outlook inbox (read-only OAuth) and automatically identifies threads where a reply is overdue, you're waiting on someone else, or a follow-up commitment is due. It surfaces these daily so you never manually hunt for forgotten emails again." },
            { q: "Will Pendingly send follow-up emails on my behalf?", a: "Only when you choose to. The scan is fully read-only. Replies send only when you hit send, and automated follow-up sequences can be set to approval mode — every draft waits for a one-tap approval. Every send also has a 10-second undo window." },
            { q: "How is my email data protected?", a: "We store only what we need — thread metadata, short snippets and sender info; bodies are excerpted, not archived. OAuth tokens, mailbox passwords and AI keys are encrypted with AES-256-GCM at rest. Every database query is scoped to your account and no secrets reach the browser." },
            { q: "What email relationship data does Pendingly track?", a: "Pendingly analyses the timing of messages you've already exchanged to estimate your typical reply speed per contact — powering relationship health scores, VIP detection, and cooling alerts when a key contact has gone quiet. Nothing is shared or sold." },
            { q: "Which AI model does Pendingly use for email classification?", a: "By default a Pendingly-managed provider. On Lite and Pro plans you can bring your own Anthropic, OpenAI or Gemini API key, so classification runs under your own provider agreement. We never train models on your email content." },
            { q: "Does Pendingly work with Gmail and Outlook?", a: "Yes — Gmail, Outlook, Zoho Mail, Apple Mail, or any IMAP account, including multiple inboxes on paid plans. The follow-up queue can be filtered to any combination of connected accounts." },
            { q: "Can I roll this out to my company?", a: "Yes. We offer volume pricing, a Data Processing Agreement, and support for your security review. Email sales@pendingly.com and we'll work with your team." },
            { q: "What happens after the free trial?", a: "Upgrade to Lite ($9/mo) or Pro ($15/mo), or earn more free time via referrals (30 days each) and stat shares (7 days each). No card to start. Cancel anytime from Settings — you keep access until the end of the period, and you can delete all your data in one click." },
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
          <LogoMark className="h-12 w-14 mx-auto mb-5" />
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
            Stop losing deals to forgotten follow-up emails.
          </h2>
          <p className="text-lg text-[rgb(11_18_32/55%)] mb-8">
            Your AI follow-up tracker is free for 3 months. Set up in under a minute. No credit card.
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
                AI email follow-up reminders and relationship tracking — built for people who close loops, not folders.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(255_255_255/45%)] mb-3">Product</p>
              <ul className="space-y-2 text-sm text-[rgb(255_255_255/70%)]">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#how" className="hover:text-white">How it works</a></li>
                <li><a href="#security" className="hover:text-white">Security</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[rgb(255_255_255/45%)] mb-3">Legal &amp; support</p>
              <ul className="space-y-2 text-sm text-[rgb(255_255_255/70%)]">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><a href="mailto:support@pendingly.com" className="hover:text-white">Support</a></li>
                <li><a href="mailto:sales@pendingly.com" className="hover:text-white">Sales &amp; teams</a></li>
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
