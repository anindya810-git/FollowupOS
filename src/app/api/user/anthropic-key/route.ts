import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { anthropicApiKeyEncrypted: true },
  })
  return NextResponse.json({
    hasKey: !!user?.anthropicApiKeyEncrypted,
    hasEnvFallback: !!process.env.ANTHROPIC_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { apiKey?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const apiKey = (body.apiKey || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 400 })
  if (!apiKey.startsWith('sk-ant-')) {
    return NextResponse.json({ error: 'Looks like that is not an Anthropic key. Keys start with "sk-ant-".' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { anthropicApiKeyEncrypted: encrypt(apiKey) },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { anthropicApiKeyEncrypted: null },
  })
  return NextResponse.json({ ok: true })
}
