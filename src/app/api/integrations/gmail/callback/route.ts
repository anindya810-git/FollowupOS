import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOAuth2Client } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

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

    // Create scan job
    const scanJob = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        emailAccountId: account.id,
        status: 'queued',
      },
    })

    // Mark onboarding started
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: false },
    })

    return NextResponse.redirect(new URL(`/scan?jobId=${scanJob.id}`, request.url))
  } catch (error) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=gmail_failed', request.url))
  }
}
