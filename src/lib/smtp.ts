import nodemailer from 'nodemailer'
import { decrypt } from './utils'
import { prisma } from './prisma'
import { isSafePublicHostname } from './net-safety'

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
}

function smtpConfigForProvider(provider: string, imapHost: string | null): SmtpConfig {
  switch (provider) {
    case 'zoho':
      return { host: 'smtp.zoho.com', port: 465, secure: true }
    case 'apple':
      return { host: 'smtp.mail.me.com', port: 587, secure: false }
    default: {
      // Generic IMAP — try to derive an SMTP host. Best-effort: replace imap. with smtp.
      const host = imapHost ? imapHost.replace(/^imap\./i, 'smtp.') : 'localhost'
      return { host, port: 587, secure: false }
    }
  }
}

export async function sendSmtpReply(
  emailAccountId: string,
  toEmail: string,
  subject: string,
  body: string,
  inReplyTo?: string,
): Promise<unknown> {
  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account) throw new Error('Email account not found')
  if (!account.passwordEncrypted) throw new Error('No SMTP password stored for this account')

  const password = decrypt(account.passwordEncrypted)
  const cfg = smtpConfigForProvider(account.provider, account.imapHost)

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: account.emailAddress,
      pass: password,
    },
  })

  const info = await transporter.sendMail({
    from: account.emailAddress,
    to: toEmail,
    subject,
    text: body,
    inReplyTo,
    references: inReplyTo,
  })

  return info
}
