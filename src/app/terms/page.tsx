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
        <p className="text-sm text-[rgb(11_18_32/45%)] mb-12">Last updated: May 18, 2026</p>

        <div className="prose-legal">

          <Section title="1. Acceptance of Terms">
            <p>By creating an account or using Pendingly ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms apply to all users, including free-trial users and paid subscribers.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Pendingly is an AI-powered email follow-up tool that connects to your email inbox, reads your messages to identify threads that require follow-up action, and surfaces actionable reminders through a dashboard and daily digest. The Service requires you to connect at least one supported email account (Gmail or Microsoft Outlook).</p>
          </Section>

          <Section title="3. Eligibility">
            <p>You must be at least 16 years old and capable of forming a binding contract to use the Service. By using Pendingly you represent and warrant that you meet these requirements.</p>
          </Section>

          <Section title="4. Account Registration">
            <p>You must sign in using a supported identity provider (currently Google). You are responsible for maintaining the security of your account and for all activity that occurs under it. Notify us immediately at <a href="mailto:support@pendingly.com" className="text-action underline">support@pendingly.com</a> if you suspect unauthorized access.</p>
          </Section>

          <Section title="5. Free Trial and Paid Plans">
            <ul>
              <li>New accounts receive a <strong>3-month free trial</strong> with no credit card required.</li>
              <li>After the trial period, continued access requires a paid subscription ("Lite" or "Pro") billed monthly or annually.</li>
              <li>Prices are displayed at the time of purchase and may change with 30 days' notice.</li>
              <li>All payments are non-refundable except where required by law or as stated in our refund policy.</li>
              <li>You may cancel at any time; access continues until the end of the current billing period.</li>
            </ul>
          </Section>

          <Section title="6. Email Access and Permissions">
            <p>To provide the Service, Pendingly requests read-only access to your connected email account(s). Specifically:</p>
            <ul>
              <li>We read email metadata (sender, recipient, subject, timestamp) and message bodies solely to classify follow-up needs.</li>
              <li>We do <strong>not</strong> send emails on your behalf unless you explicitly enable the Auto Follow-up feature and review the template.</li>
              <li>We do <strong>not</strong> store full email bodies beyond what is necessary to generate action items.</li>
              <li>You may disconnect any inbox at any time from Settings, which immediately revokes our access.</li>
            </ul>
          </Section>

          <Section title="7. Bring Your Own AI Key (BYOK)">
            <p>You may optionally provide your own API key for supported AI providers (Google Gemini, Anthropic, OpenAI). When you do, email classification calls are routed to your account and billed directly by that provider. Pendingly does not store your API key in plain text.</p>
          </Section>

          <Section title="8. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to reverse-engineer, scrape, or extract data from the Service</li>
              <li>Use the Service to send spam or harassing communications</li>
              <li>Share account credentials or allow unauthorized third parties to access your account</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these rules.</p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>All content, features, and functionality of the Service — including software, design, and branding — are the exclusive property of Pendingly and its licensors. These Terms do not grant you any intellectual property rights in the Service. Your email data remains yours.</p>
          </Section>

          <Section title="10. Privacy">
            <p>Your use of the Service is governed by our <Link href="/privacy" className="text-action underline">Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that follow-up detection will be complete or accurate. AI classification may miss threads or produce false positives.</p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>To the maximum extent permitted by law, Pendingly shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </Section>

          <Section title="13. Indemnification">
            <p>You agree to indemnify and hold harmless Pendingly, its officers, directors, and employees from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.</p>
          </Section>

          <Section title="14. Changes to Terms">
            <p>We may update these Terms from time to time. Material changes will be communicated via email or a prominent notice on the Service at least 14 days before taking effect. Continued use after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="15. Termination">
            <p>You may delete your account at any time from Settings → Account → Danger Zone. Upon deletion, your data is permanently removed. We may suspend or terminate your account immediately if you violate these Terms.</p>
          </Section>

          <Section title="16. Governing Law">
            <p>These Terms are governed by the laws of India, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the courts located in Bengaluru, Karnataka, India.</p>
          </Section>

          <Section title="17. Contact">
            <p>Questions about these Terms? Contact us at <a href="mailto:support@pendingly.com" className="text-action underline">support@pendingly.com</a>.</p>
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
