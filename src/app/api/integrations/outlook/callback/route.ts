import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { exchangeOutlookCode, getOutlookUserEmail } from '@/lib/outlook'
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
    return NextResponse.redirect(new URL('/dashboard?error=outlook_denied', request.url))
  }

  try {
    const tokens = await exchangeOutlookCode(code)
    const emailAddress = await getOutlookUserEmail(tokens.access_token)

    if (!emailAddress) {
      return NextResponse.redirect(new URL('/dashboard?error=outlook_no_email', request.url))
    }

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Upsert email account
    const account = await prisma.emailAccount.upsert({
      where: { userId_emailAddress: { userId: session.user.id, emailAddress } },
      create: {
        userId: session.user.id,
        provider: 'outlook',
        emailAddress,
        accessTokenEncrypted: encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt,
        connectedStatus: 'connected',
      },
      update: {
        accessTokenEncrypted: encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt,
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

    return NextResponse.redirect(new URL(`/connect/anthropic?jobId=${scanJob.id}`, request.url))
  } catch (error) {
    console.error('Outlook callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=outlook_failed', request.url))
  }
}
