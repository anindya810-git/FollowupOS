'use client'
import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { ChevronDown, Mail, Lock, Zap, Settings as SettingsIcon, BarChart2, MessageCircle } from 'lucide-react'

interface FAQ { q: string; a: string }
interface FAQSection { title: string; icon: React.ComponentType<{ className?: string }>; faqs: FAQ[] }

const SECTIONS: FAQSection[] = [
  {
    title: 'Getting started',
    icon: Zap,
    faqs: [
      {
        q: 'How does Pendingly work?',
        a: 'Pendingly connects to your inbox (Gmail, Outlook, Zoho, Apple Mail, or generic IMAP), reads the last 30 days of email with AI, and labels each thread as Reply Needed, Waiting on Them, Follow-up Due, Commitment, Overdue, or No Action. You see only the threads that need action.',
      },
      {
        q: 'How long does the initial scan take?',
        a: 'About 2 minutes for a typical 30-day inbox (~500 threads). Larger inboxes take longer. You can leave the scan running — we will notify you when it is done.',
      },
      {
        q: 'Can I connect multiple inboxes?',
        a: 'Yes. Connect any number of Gmail, Outlook, Zoho, Apple Mail, or generic IMAP accounts from Settings → Connected Inboxes. They all feed into one unified queue.',
      },
      {
        q: 'Does Pendingly send emails on my behalf?',
        a: 'Only when you explicitly hit Send Reply in the drawer, or if you opt in to auto follow-ups in Settings → Automation. Without those, Pendingly is read-only.',
      },
    ],
  },
  {
    title: 'Privacy & security',
    icon: Lock,
    faqs: [
      {
        q: 'Where is my email data stored?',
        a: 'Only thread metadata (subject, participants, snippets) and AI classifications are stored — never the full message body. OAuth tokens and IMAP passwords are encrypted with AES-256-GCM before being written to the database.',
      },
      {
        q: 'Who can read my emails?',
        a: 'Nobody at Pendingly. Your data is scoped to your user account by every API endpoint. Classifications run through Pendingly Assist with no training opt-in.',
      },
      {
        q: 'How do I disconnect an inbox?',
        a: 'Settings → Connected Inboxes → Disconnect. This revokes our access and deletes all stored threads/messages for that account.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Settings → Danger Zone → Delete Account. This is permanent and removes every byte of your data within seconds.',
      },
    ],
  },
  {
    title: 'Daily workflow',
    icon: Mail,
    faqs: [
      {
        q: 'What does Snooze do?',
        a: 'Snooze hides the item until the date you pick. We have smart defaults: Tomorrow 9am, This weekend, Next Monday, Next week, 2 weeks. The item reappears in your queue at the chosen time.',
      },
      {
        q: 'What is the difference between Ignore and Done?',
        a: 'Done means you handled it. Ignore means this kind of email is noise — Pendingly learns from that and is less likely to surface similar threads in the future.',
      },
      {
        q: 'How do bulk actions work?',
        a: 'In the Queue, click the checkbox on any card. A floating action bar appears at the bottom. Select multiple items, then Mark Done, Snooze, or Ignore them all in one click.',
      },
      {
        q: 'Can I reply directly from Pendingly?',
        a: 'Yes. Open any item, generate a draft in your preferred tone, review it, and hit Send Reply. The reply is sent through the original inbox (Gmail, Outlook, etc.) and the item is marked Done automatically.',
      },
    ],
  },
  {
    title: 'Automation',
    icon: SettingsIcon,
    faqs: [
      {
        q: 'How does auto follow-up work?',
        a: 'In Settings → Automation, enable auto follow-up and set a days-of-silence threshold (default 3). Pendingly sends a templated reply to any "Waiting on Them" item that has been quiet for that long. You write the template; we render it with the contact name.',
      },
      {
        q: 'Will auto follow-up spam my contacts?',
        a: 'No. Each thread is only auto-followed-up once. You can also set the threshold to 7 or 14 days for a slower cadence.',
      },
      {
        q: 'How do I set up the Slack digest?',
        a: 'Create an Incoming Webhook in your Slack workspace, paste the URL into Settings → Slack Integration, hit Test. Once verified, you will get a daily digest at 9am with your top 5 follow-ups.',
      },
      {
        q: 'What about mobile notifications?',
        a: 'Settings → Notifications → Enable notifications. This installs Pendingly as a PWA on your phone and sends a daily morning push with your open item count.',
      },
    ],
  },
  {
    title: 'Analytics',
    icon: BarChart2,
    faqs: [
      {
        q: 'What is the Health Score?',
        a: 'A 0-100 composite of your open items (lower is better), overdue count, and resolved-this-week count. 70+ is healthy, 40-69 is fair, below 40 needs attention.',
      },
      {
        q: 'What is TAT?',
        a: 'Turn-Around Time — the average days between an item appearing in your queue and you marking it Done. Lower is better. Tracked per category so you can see where you are slow.',
      },
      {
        q: 'Why does my "waiting on them" TAT look high?',
        a: 'Those items resolve when the other person finally responds, which is outside your control. Use the Top Contacts chart to see who is consistently slow, and consider enabling auto follow-up.',
      },
    ],
  },
]

export function HelpClient({ userEmail }: { userEmail: string }) {
  const [openIdx, setOpenIdx] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filteredSections = SECTIONS.map(section => ({
    ...section,
    faqs: section.faqs.filter(f =>
      !query ||
      f.q.toLowerCase().includes(query.toLowerCase()) ||
      f.a.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter(s => s.faqs.length > 0)

  return (
    <>
      <Header title="Help" userEmail={userEmail} />
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Help & FAQs</h1>
          <p className="text-sm text-mute mt-1">Everything you might want to know about Pendingly.</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full px-4 py-3 bg-white border border-rule rounded-lg text-sm focus:outline-none focus:border-ink/30 transition-colors"
          />
        </div>

        <div className="space-y-6">
          {filteredSections.map(section => {
            const SectionIcon = section.icon
            return (
              <section key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <SectionIcon className="h-4 w-4 text-action" />
                  <h2
                    className="text-xs font-medium tracking-[0.14em] uppercase text-mute"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {section.title}
                  </h2>
                </div>
                <div className="bg-white border border-rule rounded-lg overflow-hidden">
                  {section.faqs.map((faq, i) => {
                    const id = `${section.title}-${i}`
                    const open = openIdx === id
                    return (
                      <div key={id} className={i > 0 ? 'border-t border-rule' : ''}>
                        <button
                          onClick={() => setOpenIdx(open ? null : id)}
                          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-paper-2 transition-colors"
                        >
                          <span className="text-sm font-medium text-ink pr-4">{faq.q}</span>
                          <ChevronDown
                            className={`h-4 w-4 text-mute flex-shrink-0 transition-transform duration-200 ${
                              open ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {open && (
                          <div className="px-5 pb-4 text-sm text-mute leading-relaxed animate-fade-up">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {filteredSections.length === 0 && (
            <p className="text-center text-mute text-sm py-12">
              No FAQs match &ldquo;{query}&rdquo;. Try a different search.
            </p>
          )}
        </div>

        {/* Contact section */}
        <div className="mt-12 bg-paper-2 border border-rule rounded-lg p-6 flex items-start gap-4">
          <MessageCircle className="h-5 w-5 text-action mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink mb-1">Still stuck?</p>
            <p className="text-sm text-mute leading-relaxed">
              Email us at <a href="mailto:support@pendingly.app" className="text-ink underline hover:text-action">support@pendingly.app</a> — we read every message and reply within a business day.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
