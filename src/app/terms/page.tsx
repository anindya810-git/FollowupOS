import { type ReactNode } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/Logo'

export const metadata = { title: 'Terms of Service — Pendingly' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)]">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-7 w-8 flex-shrink-0" />
          <span className="text-xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-ink mb-2">Terms of Service</h1>
        <p className="text-sm text-[rgb(11_18_32/45%)] mb-12">Last updated: May 30, 2026</p>

        <div className="prose-legal">

          <Section title="1. Acceptance of Terms">
            <p>By creating an account or using Pendingly (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. These Terms apply to all users, including free-trial users, paid subscribers, and members of a team or organisation account.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Pendingly is an AI-assisted email follow-up and relationship-management tool. When you connect one or more email accounts, Pendingly:</p>
            <ul>
              <li>reads your recent messages to classify which threads need a reply, which you are waiting on, which are follow-up due, and which contain commitments;</li>
              <li>surfaces these as an action queue, a daily digest, and push notifications;</li>
              <li>generates optional AI drafts, thread summaries, and relationship insights (e.g. typical reply time, &ldquo;cooling&rdquo; and VIP signals) derived from your message history;</li>
              <li>can, at your direction, send replies and multi-step follow-up sequences, schedule sends, create calendar events or tasks, and post notifications to channels you configure.</li>
            </ul>
            <p>Supported inboxes include Gmail, Microsoft Outlook, Zoho Mail, Apple Mail, and other IMAP providers.</p>
          </Section>

          <Section title="3. Eligibility">
            <p>You must be at least 16 years old and capable of forming a binding contract to use the Service. By using Pendingly you represent and warrant that you meet these requirements and that any account you connect is one you are authorised to access.</p>
          </Section>

          <Section title="4. Account Registration">
            <p>You sign in using a supported identity provider (currently Google). You are responsible for maintaining the security of your account and for all activity under it. Notify us immediately at <a href="mailto:support@pendingly.com">support@pendingly.com</a> if you suspect unauthorised access.</p>
          </Section>

          <Section title="5. Free Trial and Paid Plans">
            <ul>
              <li>New accounts receive a <strong>3-month free trial</strong> with no credit card required.</li>
              <li>After the trial, continued access to paid features requires a subscription (&ldquo;Lite&rdquo; or &ldquo;Pro&rdquo;), billed monthly or annually.</li>
              <li>Prices are shown at the time of purchase and may change with at least 30 days&rsquo; notice.</li>
              <li>Payments are non-refundable except where required by law.</li>
              <li>You may cancel at any time; access continues until the end of the current billing period.</li>
              <li>Team and volume arrangements are available by contacting <a href="mailto:sales@pendingly.com">sales@pendingly.com</a>.</li>
            </ul>
          </Section>

          <Section title="6. Connected Accounts, Permissions & Scopes">
            <p>To provide the Service, Pendingly requests only the access it needs, and only for the connectors you enable:</p>
            <ul>
              <li><strong>Email (read):</strong> the classification scan is <strong>read-only</strong>. We read metadata (sender, recipient, subject, timestamp) and message text solely to classify follow-up needs and generate summaries.</li>
              <li><strong>Email (send):</strong> we send a message only when you explicitly send it, or when you have enabled an automated sequence (see Section 7).</li>
              <li><strong>Calendar &amp; tasks (write):</strong> only if you install a calendar connector, and only to create the events or tasks you ask for.</li>
              <li><strong>Conferencing &amp; notifications:</strong> if you connect Zoom, Slack, Microsoft Teams, or WhatsApp, we use them only to create the meeting links or send the digests you configure.</li>
            </ul>
            <p>You may disconnect any inbox or integration at any time from Settings, which immediately revokes the associated access.</p>
          </Section>

          <Section title="7. Automated Sending & Your Control">
            <p>Pendingly is designed so that nothing leaves your mailbox without your control:</p>
            <ul>
              <li><strong>Approval mode</strong> holds every automated follow-up as a draft until you approve it with a single tap.</li>
              <li><strong>Undo window:</strong> sends you initiate include a short cancellation window.</li>
              <li><strong>Pause everything</strong> halts all automated sending, sequences, and notifications until you resume.</li>
            </ul>
            <p>You are solely responsible for the content of messages sent through the Service and for ensuring your use complies with applicable anti-spam and electronic-communications laws (e.g. CAN-SPAM, GDPR/ePrivacy, India&rsquo;s DPDP Act). Do not use the Service to send unsolicited bulk email.</p>
          </Section>

          <Section title="8. Relationship Insights">
            <p>Pendingly derives signals such as typical reply time, VIP status, and &ldquo;cooling&rdquo; relationships from the timing and pattern of messages already in your connected accounts. These insights are generated for your own use within your account. They are estimates and may be incomplete or inaccurate; you should not rely on them as the sole basis for any decision.</p>
          </Section>

          <Section title="9. Bring Your Own AI Key (BYOK)">
            <p>You may optionally provide your own API key for a supported AI provider (Google Gemini, Anthropic, or OpenAI). When you do, classification and drafting calls are routed to your account and billed directly by that provider under their terms. Your key is encrypted at rest and never returned to the browser or logged in plain text. Without a BYOK key, calls use a Pendingly-managed provider subject to your plan&rsquo;s quota.</p>
          </Section>

          <Section title="10. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>use the Service for any unlawful purpose or in violation of applicable laws;</li>
              <li>send spam, harassing, deceptive, or unsolicited bulk communications;</li>
              <li>connect an account you are not authorised to access;</li>
              <li>attempt to reverse-engineer, scrape, probe, or circumvent the security of the Service;</li>
              <li>share credentials or let unauthorised parties use your account;</li>
              <li>interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
            <p>We may suspend or terminate accounts that violate these rules.</p>
          </Section>

          <Section title="11. Third-Party Services">
            <p>The Service interoperates with third parties including Google, Microsoft, your chosen AI provider, and any conferencing or notification channels you connect. Your use of those services is governed by their own terms and privacy policies. Pendingly&rsquo;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>
          </Section>

          <Section title="12. Intellectual Property">
            <p>All software, design, and branding of the Service are the exclusive property of Pendingly and its licensors. These Terms grant you no intellectual-property rights in the Service. Your email data and the content you create remain yours.</p>
          </Section>

          <Section title="13. Privacy">
            <p>Your use of the Service is governed by our <Link href="/privacy" className="text-action underline">Privacy Policy</Link>, incorporated into these Terms by reference.</p>
          </Section>

          <Section title="14. Disclaimer of Warranties">
            <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind. We do not warrant that it will be uninterrupted or error-free, or that classification, summaries, or relationship insights will be complete or accurate. AI output may miss threads or produce false positives; review before acting.</p>
          </Section>

          <Section title="15. Limitation of Liability">
            <p>To the maximum extent permitted by law, Pendingly is not liable for any indirect, incidental, special, consequential, or punitive damages, or for any messages sent, missed, or delayed through the Service. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </Section>

          <Section title="16. Indemnification">
            <p>You agree to indemnify and hold harmless Pendingly, its officers, directors, and employees from any claims, damages, or expenses arising from your use of the Service, the content you send through it, or your violation of these Terms.</p>
          </Section>

          <Section title="17. Changes to Terms">
            <p>We may update these Terms from time to time. Material changes will be communicated by email or a prominent notice on the Service at least 14 days before taking effect. Continued use after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="18. Termination & Data Deletion">
            <p>You may delete your account at any time from Settings &rarr; Account &rarr; Danger Zone. Upon deletion, your stored data is permanently removed. We may suspend or terminate accounts that violate these Terms.</p>
          </Section>

          <Section title="19. Governing Law">
            <p>These Terms are governed by the laws of India, without regard to conflict-of-law principles. Disputes shall be resolved exclusively in the courts of Bengaluru, Karnataka, India.</p>
          </Section>

          <Section title="20. Contact">
            <p>Questions about these Terms? Contact <a href="mailto:support@pendingly.com">support@pendingly.com</a>.</p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-[rgb(11_18_32/8%)] py-8 px-6 text-center text-xs text-[rgb(11_18_32/40%)]">
        <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>
        <span className="mx-3">·</span>
        <Link href="/" className="underline hover:text-ink">Back to Pendingly</Link>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-ink mb-3">{title}</h2>
      <div className="space-y-3 text-[rgb(11_18_32/70%)] text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-action [&_a]:underline [&_strong]:text-ink [&_strong]:font-medium">
        {children}
      </div>
    </section>
  )
}
