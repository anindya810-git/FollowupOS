import { type ReactNode } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/Logo'

export const metadata = { title: 'Payment & Refund Policy — Pendingly' }

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)]">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-7 w-8 flex-shrink-0" />
          <span className="text-xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-ink mb-2">Payment &amp; Refund Policy</h1>
        <p className="text-sm text-[rgb(11_18_32/45%)] mb-12">Last updated: June 1, 2026</p>

        <div className="prose-legal">

          <Section title="1. Overview">
            <p>
              This Payment &amp; Refund Policy governs all purchases made on Pendingly
              (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;), operated by Anindya Roy Chowdhury, and accessible at{' '}
              <strong>pendingly.com</strong>. By completing a purchase you agree to this policy in full.
              Questions? Write to us at <a href="mailto:support@pendingly.com">support@pendingly.com</a>.
            </p>
          </Section>

          <Section title="2. Plans &amp; Pricing">
            <p>Pendingly offers the following subscription plans:</p>
            <ul>
              <li><strong>Free Trial</strong> — 90 days at no cost. No credit card required to start.</li>
              <li><strong>Lite</strong> — USD&nbsp;9 / month (or equivalent in INR at the prevailing exchange rate).</li>
              <li><strong>Pro</strong> — USD&nbsp;15 / month (or equivalent in INR at the prevailing exchange rate).</li>
            </ul>
            <p>
              All prices are displayed inclusive of applicable taxes where required by law. Pendingly
              reserves the right to change plan prices with at least 30 days&rsquo; notice to active subscribers.
            </p>
          </Section>

          <Section title="3. Payment Methods">
            <p>We accept the following payment methods:</p>
            <ul>
              <li>Credit and debit cards (Visa, Mastercard, American Express, RuPay)</li>
              <li>UPI (Unified Payments Interface)</li>
              <li>Net banking</li>
              <li>Wallets (where supported by the payment gateway)</li>
            </ul>
            <p>
              Payments are processed securely via <strong>Razorpay</strong> (for India) and{' '}
              <strong>Stripe</strong> (for international transactions). We do not store your card
              details on our servers. All payment data is handled directly by the respective payment
              gateway in accordance with PCI-DSS standards.
            </p>
          </Section>

          <Section title="4. Billing Cycle">
            <p>
              Subscriptions are billed on a <strong>monthly</strong> basis from the date of your
              first successful payment. Your plan renews automatically at the end of each billing
              period unless you cancel before the renewal date.
            </p>
            <p>
              You will receive an email receipt after each successful charge. If a payment fails, we
              will attempt to notify you and may retry the charge up to three times over 7 days
              before suspending access to paid features.
            </p>
          </Section>

          <Section title="5. Free Trial">
            <p>
              New accounts receive a <strong>90-day free trial</strong> with full access to Pendingly
              features. No payment information is required during the trial. At the end of the trial
              your account transitions to a read-only state — existing data is preserved for 30 days
              while you decide whether to subscribe.
            </p>
            <p>
              Referral bonuses (30 free days per successful referral) are added on top of any active
              plan and cannot be converted to cash.
            </p>
          </Section>

          <Section title="6. Cancellation">
            <p>
              You may cancel your subscription at any time from the <strong>Settings → Account</strong>{' '}
              page or by writing to <a href="mailto:support@pendingly.com">support@pendingly.com</a>.
              Cancellation takes effect at the end of the current billing period — you retain access
              to paid features until then. We do not charge cancellation fees.
            </p>
          </Section>

          <Section title="7. Refund Policy">
            <h3>7.1 Standard refunds</h3>
            <p>
              We offer a <strong>7-day refund window</strong> from the date of each payment. If you
              are not satisfied with Pendingly for any reason, contact us at{' '}
              <a href="mailto:support@pendingly.com">support@pendingly.com</a> within 7 days of the
              charge and we will issue a full refund — no questions asked.
            </p>

            <h3>7.2 Requests outside the refund window</h3>
            <p>
              Refund requests made after 7 days of the charge date are evaluated on a case-by-case
              basis. We may grant a partial or full refund at our discretion in the following
              circumstances:
            </p>
            <ul>
              <li>Extended service outage (more than 24 consecutive hours) that we caused;</li>
              <li>Duplicate or erroneous charges;</li>
              <li>Demonstrable technical issue that prevented you from using the service.</li>
            </ul>

            <h3>7.3 Non-refundable items</h3>
            <p>The following are not eligible for refunds:</p>
            <ul>
              <li>Months already used where the service functioned normally;</li>
              <li>Referral bonus days or promotional credits;</li>
              <li>Upgrades where you downgrade mid-cycle (the difference is not refunded, but no additional charge is made).</li>
            </ul>
          </Section>

          <Section title="8. How Refunds Are Processed">
            <p>
              Approved refunds are returned to the original payment method within{' '}
              <strong>5&ndash;10 business days</strong> (the exact timing depends on your bank or
              card network). We will send a confirmation email once the refund has been initiated on
              our end.
            </p>
            <p>
              For UPI and net-banking payments processed through Razorpay, refunds are credited
              directly to the source account. For international card payments processed through
              Stripe, the refund appears as a reversal on your card statement.
            </p>
          </Section>

          <Section title="9. Disputes &amp; Chargebacks">
            <p>
              If you believe a charge is incorrect, please contact us at{' '}
              <a href="mailto:support@pendingly.com">support@pendingly.com</a> before raising a
              dispute with your bank. Most issues can be resolved faster through us.
            </p>
            <p>
              Filing a chargeback without first contacting us may result in suspension of your
              account while the dispute is under review. If a chargeback is found to be
              illegitimate, we reserve the right to recover the disputed amount and any associated
              fees.
            </p>
          </Section>

          <Section title="10. Failed Transactions">
            <p>
              If a payment fails, you will not be charged. Please check:
            </p>
            <ul>
              <li>Your card has sufficient balance or limit;</li>
              <li>International transactions are enabled on your card (for non-Indian cards);</li>
              <li>Your bank has not blocked the transaction (some banks require OTP confirmation for online payments).</li>
            </ul>
            <p>
              If you are still unable to complete payment, write to us at{' '}
              <a href="mailto:support@pendingly.com">support@pendingly.com</a> and we will assist.
            </p>
          </Section>

          <Section title="11. Taxes">
            <p>
              Prices shown may be subject to applicable taxes (such as GST for customers in India)
              which will be calculated and displayed at checkout. You are responsible for any taxes
              applicable in your jurisdiction.
            </p>
            <p>
              Tax invoices are available on request. Write to{' '}
              <a href="mailto:support@pendingly.com">support@pendingly.com</a> with your GSTIN
              and billing details.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this policy from time to time. Material changes will be communicated by
              email and by updating the &ldquo;Last updated&rdquo; date above. Continued use of
              Pendingly after such changes constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="13. Contact Us">
            <p>
              For any payment or refund queries, reach us at:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:support@pendingly.com">support@pendingly.com</a></li>
              <li><strong>Response time:</strong> within 1 business day</li>
              <li><strong>Business hours:</strong> Monday – Friday, 9 AM – 6 PM IST</li>
            </ul>
          </Section>

        </div>
      </main>

      <footer className="border-t border-[rgb(11_18_32/8%)] py-8 px-6 text-center text-xs text-[rgb(11_18_32/40%)]">
        <Link href="/terms" className="underline hover:text-ink">Terms of Service</Link>
        <span className="mx-3">·</span>
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
      <div className="space-y-3 text-[rgb(11_18_32/70%)] text-sm leading-relaxed [&_h3]:text-ink [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-action [&_a]:underline [&_strong]:text-ink [&_strong]:font-medium">
        {children}
      </div>
    </section>
  )
}
