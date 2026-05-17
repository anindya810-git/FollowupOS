import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/utils'
import { testImapConnection } from '@/lib/imap'
import { isSafePublicHostname } from '@/lib/net-safety'
import { safeLog } from '@/lib/safe-log'

const PROVIDER_PRESETS: Record<string, { host: string; port: number }> = {
  zoho:  { host: 'imap.zoho.com',    port: 993 },
  apple: { host: 'imap.mail.me.com', port: 993 },
}

const ALLOWED_PROVIDERS = new Set(['zoho', 'apple', 'imap'])

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { provider?: unknown; email?: unknown; password?: unknown; host?: unknown; port?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const provider = typeof body.provider === 'string' ? body.provider : ''
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const customHost = typeof body.host === 'string' ? body.host : ''
  const customPort = body.port

  if (!provider || !email || !password) {
    return NextResponse.json({ error: 'provider, email, and password are required' }, { status: 400 })
  }
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // Determine host/port from preset or user input
  const preset = PROVIDER_PRESETS[provider]
  const host: string = preset?.host || customHost
  const portNum = typeof customPort === 'number'
    ? customPort
    : typeof customPort === 'string' ? parseInt(customPort, 10) : NaN
  const port: number = preset?.port || (Number.isFinite(portNum) && portNum > 0 && portNum < 65536 ? portNum : 993)

  if (!host) {
    return NextResponse.json({ error: 'IMAP host is required for custom providers' }, { status: 400 })
  }
  if (!isSafePublicHostname(host)) {
    return NextResponse.json({ error: 'IMAP host must be a valid public hostname' }, { status: 400 })
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

  // Create ScanJob and kick off the scan — the IMAP route was previously
  // creating a queued job that nothing ever picked up, so the /scan?jobId=…
  // page polled forever.
  const scanJob = await prisma.scanJob.create({
    data: {
      userId: session.user.id,
      emailAccountId: account.id,
      status: 'queued',
    },
  })

  triggerScan(scanJob.id, session.user.id, account.id)

  return NextResponse.json({ jobId: scanJob.id, success: true })
}

async function triggerScan(jobId: string, userId: string, accountId: string) {
  try {
    const { runInitialScan } = await import('@/lib/scanner')
    await runInitialScan(jobId, userId, accountId)
  } catch (error) {
    safeLog('error', 'imap-scan', error)
  }
}
