import nodemailer from 'nodemailer'

interface DigestPayload {
  userName?: string
  totalOpen: number
  overdueCount: number
  topItems: Array<{ title: string; reason: string; category: string; ownerName?: string | null }>
}

export async function sendEmailDigest(toEmail: string, payload: DigestPayload) {
  const smtpHost = process.env.DIGEST_SMTP_HOST
  if (!smtpHost) {
    throw new Error('Email digest not configured: set DIGEST_SMTP_HOST')
  }

  const smtpPort = parseInt(process.env.DIGEST_SMTP_PORT ?? '587', 10)
  const smtpUser = process.env.DIGEST_SMTP_USER
  const smtpPass = process.env.DIGEST_SMTP_PASS
  const fromEmail = process.env.DIGEST_FROM_EMAIL ?? 'Pendingly <noreply@pendingly.app>'

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  })

  const greeting = payload.userName ? `Hi ${payload.userName},` : 'Hi there,'

  const itemRows = payload.topItems.slice(0, 5).map(item => {
    const owner = item.ownerName ? ` <span style="color:#666;">(${item.ownerName})</span>` : ''
    return `
      <li style="margin-bottom:10px;">
        <strong style="color:#0B1220;">${escapeHtml(item.title)}</strong>${owner}<br/>
        <span style="color:#555;font-size:13px;">${escapeHtml(item.reason)}</span>
      </li>`
  }).join('')

  const itemsSection = payload.topItems.length > 0
    ? `<p style="font-size:15px;font-weight:600;color:#0B1220;margin:24px 0 10px;">Top priorities today:</p>
       <ul style="padding-left:20px;margin:0;">${itemRows}</ul>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0B1220;padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
              📬 Your Pendingly Digest
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#0B1220;">${greeting}</p>
            <p style="margin:0 0 20px;font-size:15px;color:#555;">Here&apos;s your daily follow-up summary:</p>

            <!-- Stats -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:16px 20px;width:50%;text-align:center;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:#0B1220;">${payload.totalOpen}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#777;">Open follow-ups</p>
                </td>
                <td style="width:12px;"></td>
                <td style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:16px 20px;width:50%;text-align:center;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:${payload.overdueCount > 0 ? '#F25A3C' : '#0B1220'};">${payload.overdueCount}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#777;">Overdue</p>
                </td>
              </tr>
            </table>

            ${itemsSection}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
              <tr>
                <td align="center">
                  <a href="https://pendingly.app/dashboard"
                     style="display:inline-block;background:#F25A3C;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;">
                    Open Pendingly
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:12px;color:#999;text-align:center;">
              You&apos;re receiving this because you enabled daily digests in
              <a href="https://pendingly.app/settings" style="color:#F25A3C;">Pendingly settings</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: `Your Pendingly digest — ${payload.totalOpen} open follow-up${payload.totalOpen !== 1 ? 's' : ''}`,
    html,
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
