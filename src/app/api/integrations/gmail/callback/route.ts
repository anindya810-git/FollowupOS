import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOAuth2Client } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/utils'
import { verifyOAuthState } from '@/lib/oauth-state'
import { safeLog } from '@/lib/safe-log'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  // CSRF protection: reject if state cookie missing or mismatched.
  if (!(await verifyOAuthState('gmail', session.user.id, state))) {
    return NextResponse.redirect(new URL('/dashboard?error=gmail_state', request.url))
  }

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?error=gmail_denied', request.url))
  }

  try {
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    // Get user email from token info
    oauth2Client.setCredentials(tokens)
    const gmail = (await import('googleapis')).google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const emailAddress = profile.data.emailAddress || ''

    // Upsert email account
    const account = await prisma.emailAccount.upsert({
      where: { userId_emailAddress: { userId: session.user.id, emailAddress } },
      create: {
        userId: session.user.id,
        provider: 'gmail',
        emailAddress,
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connectedStatus: 'connected',
      },
      update: {
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        connectedStatus: 'connected',
        initialScanCompleted: false,
      },
    })

    // Create app settings if not exists
    await prisma.appSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    })

    // Is this an *additional* inbox? If the user already has another connected
    // account, they're an existing user adding a second inbox.
    const otherConnected = await prisma.emailAccount.count({
      where: { userId: session.user.id, connectedStatus: 'connected', id: { not: account.id } },
    })
    const isAdditionalInbox = otherConnected > 0

    if (isAdditionalInbox) {
      // Don't scan yet. Send the user to Settings with a setup prompt where they
      // choose scan sensitivity + instructions for this inbox, then start the
      // scan themselves. The scan then runs in the background (inline progress
      // in Settings) so the rest of the app stays usable. Onboarding is untouched.
      return NextResponse.redirect(new URL(`/settings?setup=gmail&account=${account.id}`, request.url))
    }

    // First inbox — run the full onboarding flow (AI key setup + scan page).
    // Create scan job and kick it off (was previously queued forever; the
    // /scan page only re-picked it up because /api/scan/start is idempotent).
    const scanJob = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        emailAccountId: account.id,
        status: 'queued',
      },
    })
    triggerScan(scanJob.id, session.user.id, account.id)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: false },
    })

    return NextResponse.redirect(new URL(`/connect/anthropic?jobId=${scanJob.id}`, request.url))
  } catch (error) {
    safeLog('error', 'gmail-callback', error)
    return NextResponse.redirect(new URL('/dashboard?error=gmail_failed', request.url))
  }
}

async function triggerScan(jobId: string, userId: string, accountId: string) {
  try {
    const { runInitialScan } = await import('@/lib/scanner')
    await runInitialScan(jobId, userId, accountId)
  } catch (error) {
    safeLog('error', 'gmail-scan', error)
  }
}
