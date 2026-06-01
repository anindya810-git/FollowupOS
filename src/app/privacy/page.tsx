import { type ReactNode } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/Logo'

export const metadata = { title: 'Privacy Policy — Pendingly' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)]">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-7 w-8 flex-shrink-0" />
          <span className="text-xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-ink mb-2">Privacy Policy</h1>
        <p className="text-sm text-[rgb(11_18_32/45%)] mb-12">Last updated: May 30, 2026</p>

        <div className="prose-legal">

          <Section title="1. Who We Are">
            <p>Pendingly (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates the email follow-up and relationship-management service known as Pendingly. This Privacy Policy explains what we collect, how we use it, and the choices you have. Questions? <a href="mailto:privacy@pendingly.com">privacy@pendingly.com</a>.</p>
          </Section>

          <Section title="2. Information We Collect">
            <h3>Account information</h3>
            <p>When you sign in with Google, we receive your name, email address, and profile picture to identify your account.</p>

            <h3>Email data</h3>
            <p>With read-only access to the inbox(es) you connect, we process:</p>
            <ul>
              <li><strong>Metadata</strong>: sender, recipient, subject, timestamp, and thread identifiers;</li>
              <li><strong>Message text</strong>: passed to an AI model for classification, drafting, and summaries.</li>
            </ul>
            <p>We store excerpts and short snippets needed to render your queue and summaries — <strong>not</strong> full archived message bodies.</p>

            <h3>Derived relationship data</h3>
            <p>From the timing and pattern of messages already in your accounts, we compute per-contact signals such as typical reply time, &ldquo;cooling&rdquo; status, and VIP scores. These are generated for your use within your account.</p>

            <h3>Integration &amp; notification data</h3>
            <p>If you enable connectors, we store what is needed to operate them: calendar events/tasks we create at your request, a saved phone number (for WhatsApp digests), and webhook URLs you provide (for Slack/Teams digests). Push-notification subscriptions are stored to deliver reminders.</p>

            <h3>Usage data</h3>
            <p>Standard server logs (IP address, browser type, timestamps) for security and performance. We do <strong>not</strong> use third-party advertising or analytics trackers.</p>

            <h3>Payment information</h3>
            <p>Payments are handled by our payment processor. We do not store card details — only your subscription status and plan.</p>

            <h3>AI API keys</h3>
            <p>If you provide a Bring-Your-Own-Key API key, it is encrypted at rest, never returned to the browser, and never logged in plain text.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul>
              <li><strong>Core service</strong>: classifying your inbox, building your action queue, summaries, and relationship insights;</li>
              <li><strong>Notifications</strong>: email, push, and the digest channels you configure;</li>
              <li><strong>Sending you authorise</strong>: replies, approved follow-up sequences, and scheduled sends;</li>
              <li><strong>Billing</strong>: managing your subscription;</li>
              <li><strong>Security</strong>: detecting and preventing fraud, abuse, and unauthorised access;</li>
              <li><strong>Product improvement</strong>: aggregate, anonymised metrics (e.g. scan completion rates) — never individual email content.</li>
            </ul>
            <p>We do <strong>not</strong> sell, rent, or trade your personal data or email content, and we do not use your email content to train our own models.</p>
          </Section>

          <Section title="4. AI Processing">
            <p>Classification, drafting, and summaries use large language models. By default we use a Pendingly-managed provider. If you supply your own key, requests go directly to your chosen provider (Gemini, Anthropic, or OpenAI) under their privacy terms. Under our current provider agreements, content sent for processing is not used to train their models.</p>
          </Section>

          <Section title="5. How We Share Information (Sub-processors)">
            <p>We share information only as needed to run the Service:</p>
            <ul>
              <li><strong>Infrastructure</strong>: hosting and database providers that process data on our behalf under confidentiality terms;</li>
              <li><strong>Email &amp; calendar providers</strong>: Google and Microsoft, for the accounts you connect;</li>
              <li><strong>AI providers</strong>: for classification/drafting (see Section 4);</li>
              <li><strong>Notification channels</strong>: a messaging provider for WhatsApp, and the Slack/Teams webhooks you configure;</li>
              <li><strong>Payment processor</strong>: for subscription billing;</li>
              <li><strong>Legal</strong>: where required by law or to protect users;</li>
              <li><strong>Business transfers</strong>: under the same protections, in a merger or acquisition.</li>
            </ul>
          </Section>

          <Section title="6. Google API Limited Use">
            <p>Pendingly&rsquo;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including its Limited Use requirements. We use Gmail data only to provide and improve user-facing features within Pendingly, do not transfer it except as necessary to provide those features or as required by law, do not use it for advertising, and do not allow humans to read it except with your consent, for security, or where required by law.</p>
          </Section>

          <Section title="7. Data Retention">
            <ul>
              <li>Action items, derived insights, and thread metadata are retained while your account is active.</li>
              <li>Deleting your account permanently purges your stored data within 30 days.</li>
              <li>Disconnecting an inbox immediately revokes the access token; cached data for that inbox is deleted within 7 days.</li>
              <li>Server logs are retained for up to 90 days for security.</li>
            </ul>
          </Section>

          <Section title="8. Security">
            <p>Security is built in from the database to the browser:</p>
            <ul>
              <li>OAuth tokens, mailbox passwords, and AI keys are encrypted at rest with <strong>AES-256-GCM</strong>; encryption keys stay on the server.</li>
              <li>All traffic is served over TLS, with HSTS, a strict Content-Security-Policy, and locked-down response headers.</li>
              <li>Every database query is scoped to your account, enforcing strict tenant isolation.</li>
              <li>No secrets or source maps are shipped to the browser; no third-party trackers run on the app.</li>
              <li>Sessions expire after 7 days, and you can revoke access or delete your data at any time.</li>
            </ul>
            <p>No system is perfectly secure — please use a strong password and two-factor authentication on your Google/Microsoft account.</p>
          </Section>

          <Section title="9. Your Rights">
            <p>Depending on your location (including under GDPR and India&rsquo;s DPDP Act), you may:</p>
            <ul>
              <li><strong>Access</strong> a copy of the data we hold about you;</li>
              <li><strong>Correct</strong> inaccurate information;</li>
              <li><strong>Delete</strong> your account and all data via Settings &rarr; Account &rarr; Danger Zone, or by email;</li>
              <li><strong>Export</strong> your action items in a machine-readable format;</li>
              <li><strong>Object</strong> to processing based on legitimate interests;</li>
              <li><strong>Revoke email access</strong> by disconnecting any inbox at any time.</li>
            </ul>
            <p>To exercise a right, email <a href="mailto:privacy@pendingly.com">privacy@pendingly.com</a>. We respond within 30 days.</p>
          </Section>

          <Section title="10. Cookies">
            <p>We use a single session cookie to keep you signed in. No advertising cookies or third-party tracking pixels. Blocking cookies will prevent you from staying logged in.</p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>The Service is not directed at children under 16, and we do not knowingly collect their data. If you believe a child has provided us data, contact us and we will delete it promptly.</p>
          </Section>

          <Section title="12. International Transfers">
            <p>Our infrastructure may process data outside your country. Where you are in the EU, UK, India, or another region with transfer restrictions, by using the Service you consent to such transfers under appropriate safeguards.</p>
          </Section>

          <Section title="13. Changes to This Policy">
            <p>We may update this Policy from time to time. Material changes will be communicated by email or a notice on the Service at least 14 days in advance. Continued use after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="14. Contact">
            <p>For privacy questions or data requests: <a href="mailto:privacy@pendingly.com">privacy@pendingly.com</a>. For team/enterprise data-processing agreements: <a href="mailto:sales@pendingly.com">sales@pendingly.com</a>.</p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-[rgb(11_18_32/8%)] py-8 px-6 text-center text-xs text-[rgb(11_18_32/40%)]">
        <Link href="/terms" className="underline hover:text-ink">Terms of Service</Link>
        <span className="mx-3">·</span>
        <Link href="/refund" className="underline hover:text-ink">Payment &amp; Refund Policy</Link>
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
      <div className="space-y-3 text-[rgb(11_18_32/70%)] text-sm leading-relaxed [&_h3]:text-ink [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-action [&_a]:underline [&_strong]:text-ink [&_strong]:font-medium">
        {children}
      </div>
    </section>
  )
}
