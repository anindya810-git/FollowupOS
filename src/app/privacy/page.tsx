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
        <p className="text-sm text-[rgb(11_18_32/45%)] mb-12">Last updated: May 18, 2026</p>

        <div className="prose-legal">

          <Section title="1. Who We Are">
            <p>Pendingly ("we", "our", "us") operates the email follow-up service at pendingly.com. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service. If you have questions, contact us at <a href="mailto:privacy@pendingly.com">privacy@pendingly.com</a>.</p>
          </Section>

          <Section title="2. Information We Collect">
            <h3>Account Information</h3>
            <p>When you sign up via Google OAuth we receive your name, email address, and profile picture from your identity provider. We store this to identify your account.</p>

            <h3>Email Data</h3>
            <p>To provide follow-up detection, we access your connected inbox(es) with read-only permission. We process:</p>
            <ul>
              <li><strong>Metadata</strong>: sender address, recipient address, subject line, timestamp, and thread ID</li>
              <li><strong>Message content</strong>: body text, passed to an AI model for classification</li>
            </ul>
            <p>We do <strong>not</strong> store full email body text after classification. Processed results (action item summaries, due dates, contact names) are stored in our database tied to your account.</p>

            <h3>Usage Data</h3>
            <p>We collect standard server logs (IP address, browser type, pages visited, timestamps) for security and performance monitoring. We do not use third-party analytics trackers.</p>

            <h3>Payment Information</h3>
            <p>Payments are processed by Stripe or Razorpay. We do not store your card details; only a subscription status and plan identifier are stored in our database.</p>

            <h3>AI API Keys</h3>
            <p>If you provide a Bring Your Own Key (BYOK) API key, it is encrypted at rest and never logged in plain text.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul>
              <li><strong>Core service</strong>: Scanning your inbox and presenting follow-up action items in your dashboard and daily digest</li>
              <li><strong>Notifications</strong>: Sending email and push notifications about pending follow-ups</li>
              <li><strong>Billing</strong>: Managing your subscription and processing payments</li>
              <li><strong>Security</strong>: Detecting and preventing fraud, abuse, and unauthorized access</li>
              <li><strong>Product improvement</strong>: Aggregate, anonymised usage patterns (e.g. scan completion rates) to improve the Service — never individual email content</li>
              <li><strong>Support</strong>: Responding to your help requests</li>
            </ul>
            <p>We do <strong>not</strong> sell, rent, or trade your personal data or email content to any third party.</p>
          </Section>

          <Section title="4. AI Processing">
            <p>Email classification is performed using large language models (LLMs). By default we use the Pendingly-managed API key with Google Gemini. If you supply your own API key, requests go directly to your chosen provider (Gemini, Anthropic, or OpenAI) under their respective privacy policies.</p>
            <p>Email content sent for classification is not used to train third-party AI models under our current agreements with providers. We do not use your email content to train our own models.</p>
          </Section>

          <Section title="5. Data Sharing">
            <p>We share your information only in the following limited circumstances:</p>
            <ul>
              <li><strong>Service providers</strong>: Infrastructure partners (hosting, database, email delivery) who process data on our behalf under confidentiality agreements</li>
              <li><strong>Payment processors</strong>: Stripe and/or Razorpay for subscription billing</li>
              <li><strong>AI providers</strong>: Email content passed for classification (see Section 4)</li>
              <li><strong>Legal requirements</strong>: If required by law, court order, or to protect the safety of users</li>
              <li><strong>Business transfers</strong>: In the event of a merger or acquisition, your data may transfer to the new entity under the same privacy protections</li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <ul>
              <li>Action items and thread metadata are retained for the duration of your account.</li>
              <li>When you delete your account, all stored data is permanently purged within 30 days.</li>
              <li>Disconnecting an inbox immediately revokes our access token. Cached metadata for that inbox is deleted within 7 days.</li>
              <li>Server logs are retained for up to 90 days for security purposes.</li>
            </ul>
          </Section>

          <Section title="7. Security">
            <p>We use industry-standard security practices including TLS in transit, encryption at rest for sensitive fields, and access controls. OAuth tokens from Google and Microsoft are stored encrypted. No security system is perfect; please use a strong password for your Google/Microsoft account and enable two-factor authentication.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong>: Request a copy of the data we hold about you</li>
              <li><strong>Correction</strong>: Ask us to correct inaccurate information</li>
              <li><strong>Deletion</strong>: Delete your account and all associated data via Settings → Account → Danger Zone, or by emailing us</li>
              <li><strong>Portability</strong>: Request your action items exported in a machine-readable format</li>
              <li><strong>Objection</strong>: Object to processing based on legitimate interests</li>
              <li><strong>Revoke email access</strong>: Disconnect any inbox at any time from Settings</li>
            </ul>
            <p>To exercise any right, email <a href="mailto:privacy@pendingly.com">privacy@pendingly.com</a>. We will respond within 30 days.</p>
          </Section>

          <Section title="9. Cookies">
            <p>We use a single session cookie to keep you signed in. We do not use advertising cookies or third-party tracking pixels. You can block cookies in your browser, but this will prevent you from staying logged in.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with data, contact us and we will delete it promptly.</p>
          </Section>

          <Section title="11. International Transfers">
            <p>Our servers are located in the United States (via Vercel/Supabase infrastructure). If you are located in the EU or another region with data transfer restrictions, by using the Service you consent to the transfer of your data to these servers under appropriate safeguards.</p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email or a notice on the Service at least 14 days in advance. Continued use after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="13. Contact">
            <p>For privacy questions or data requests, contact us at <a href="mailto:privacy@pendingly.com">privacy@pendingly.com</a>.</p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-[rgb(11_18_32/8%)] py-8 px-6 text-center text-xs text-[rgb(11_18_32/40%)]">
        <Link href="/terms" className="underline hover:text-ink">Terms of Service</Link>
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
