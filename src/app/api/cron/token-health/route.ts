import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGmailClient } from '@/lib/gmail'
import { getOutlookAccessToken } from '@/lib/outlook'
import { isAuthorizedCron } from '@/lib/cron-auth'
import nodemailer from 'nodemailer'

function isAuthError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  const code = (e as { code?: number }).code
  return (
    code === 401 || code === 403 ||
    (code === 400 && msg.includes('invalid_grant')) ||
    msg.includes('invalid_grant') ||
    msg.includes('Token has been expired or revoked') ||
    msg.includes('refresh token') && msg.includes('401')
  )
}

async function sendExpiredEmail(toEmail: string, userName: string | null, expiredAddresses: string[]) {
  const smtpHost = process.env.DIGEST_SMTP_HOST
  if (!smtpHost) return

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.DIGEST_SMTP_PORT ?? '587', 10),
    secure: parseInt(process.env.DIGEST_SMTP_PORT ?? '587', 10) === 465,
    auth: process.env.DIGEST_SMTP_USER && process.env.DIGEST_SMTP_PASS
      ? { user: process.env.DIGEST_SMTP_USER, pass: process.env.DIGEST_SMTP_PASS }
      : undefined,
  })

  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  const inboxList = expiredAddresses.map(a => `<li style="margin-bottom:6px;">${a}</li>`).join('')

  await transporter.sendMail({
    from: process.env.DIGEST_FROM_EMAIL ?? 'Pendingly <noreply@pendingly.app>',
    to: toEmail,
    subject: 'Action required: reconnect your inbox',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0B1220;">
        <p style="font-size:16px;">${greeting}</p>
        <p>The following inbox connection${expiredAddresses.length > 1 ? 's have' : ' has'} expired and Pendingly can no longer scan ${expiredAddresses.length > 1 ? 'them' : 'it'}:</p>
        <ul style="margin:12px 0 16px;padding-left:20px;">${inboxList}</ul>
        <p>Please reconnect ${expiredAddresses.length > 1 ? 'them' : 'it'} to resume automatic follow-up scanning.</p>
        <p style="margin-top:24px;">
          <a href="${process.env.APP_BASE_URL ?? 'https://app.pendingly.com'}/settings?tab=inboxes"
             style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
            Reconnect in Settings
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#888;">You're receiving this because you have an account on Pendingly.</p>
      </div>
    `,
  })
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { connectedStatus: { not: 'expired' } },
    select: { id: true, provider: true, emailAddress: true, userId: true, connectedStatus: true },
  })

  const nowExpired: string[] = []
  let checked = 0

  for (const account of accounts) {
    try {
      if (account.provider === 'gmail') {
        const gmail = await getGmailClient(account.id)
        await gmail.users.getProfile({ userId: 'me' })
      } else if (account.provider === 'outlook') {
        await getOutlookAccessToken(account.id)
      } else {
        // IMAP accounts: no token to refresh, skip
        continue
      }
      checked++
    } catch (e) {
      if (isAuthError(e)) {
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: { connectedStatus: 'expired' },
        })
        nowExpired.push(account.emailAddress)
      }
      // Non-auth errors (network blip, rate limit) — don't mark expired
    }
  }

  // Group newly-expired accounts by user and send one email per user
  if (nowExpired.length > 0) {
    const expiredAccounts = await prisma.emailAccount.findMany({
      where: { emailAddress: { in: nowExpired } },
      include: { user: { select: { email: true, name: true } } },
    })

    const byUser = new Map<string, { userEmail: string; userName: string | null; addresses: string[] }>()
    for (const a of expiredAccounts) {
      if (!a.user?.email) continue
      const existing = byUser.get(a.userId)
      if (existing) {
        existing.addresses.push(a.emailAddress)
      } else {
        byUser.set(a.userId, { userEmail: a.user.email, userName: a.user.name, addresses: [a.emailAddress] })
      }
    }

    for (const { userEmail, userName, addresses } of byUser.values()) {
      await sendExpiredEmail(userEmail, userName, addresses).catch(() => {})
    }
  }

  return NextResponse.json({ checked, nowExpired })
}
