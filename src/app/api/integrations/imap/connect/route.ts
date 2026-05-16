import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/utils'
import { testImapConnection } from '@/lib/imap'

const PROVIDER_PRESETS: Record<string, { host: string; port: number }> = {
  zoho:  { host: 'imap.zoho.com',    port: 993 },
  apple: { host: 'imap.mail.me.com', port: 993 },
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { provider, email, password, host: customHost, port: customPort } = body

  if (!provider || !email || !password) {
    return NextResponse.json({ error: 'provider, email, and password are required' }, { status: 400 })
  }

  // Determine host/port from preset or user input
  const preset = PROVIDER_PRESETS[provider as string]
  const host: string = preset?.host || customHost
  const port: number = preset?.port || parseInt(customPort, 10) || 993

  if (!host) {
    return NextResponse.json({ error: 'IMAP host is required for custom providers' }, { status: 400 })
  }

  // Test connection
  const connected = await testImapConnection(host, port, email, password)
  if (!connected) {
    return NextResponse.json({ error: 'Connection failed. Check credentials.' }, { status: 400 })
  }

  // Upsert EmailAccount
  const account = await prisma.emailAccount.upsert({
    where: { userId_emailAddress: { userId: session.user.id, emailAddress: email } },
    create: {
      userId: session.user.id,
      provider,
      emailAddress: email,
      imapHost: host,
      imapPort: port,
      passwordEncrypted: encrypt(password),
      connectedStatus: 'connected',
    },
    update: {
      provider,
      imapHost: host,
      imapPort: port,
      passwordEncrypted: encrypt(password),
      connectedStatus: 'connected',
    },
  })

  // Create ScanJob
  const scanJob = await prisma.scanJob.create({
    data: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: 'queued',
    },
  })

  return NextResponse.json({ jobId: scanJob.id, success: true })
}
