import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'
import type { AiProvider } from '@/lib/ai'
import { getUserPlan, isByokAllowed } from '@/lib/plan'

const PROVIDERS: AiProvider[] = ['anthropic', 'openai', 'gemini']

function encryptedFieldFor(provider: AiProvider) {
  if (provider === 'anthropic') return 'anthropicApiKeyEncrypted'
  if (provider === 'openai')    return 'openaiApiKeyEncrypted'
  return 'geminiApiKeyEncrypted'
}

function validateKey(provider: AiProvider, key: string): string | null {
  if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
    return 'Anthropic keys start with "sk-ant-"'
  }
  if (provider === 'openai' && !key.startsWith('sk-')) {
    return 'OpenAI keys start with "sk-"'
  }
  return null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      preferredAiProvider: true,
      anthropicApiKeyEncrypted: true,
      openaiApiKeyEncrypted:    true,
      geminiApiKeyEncrypted:    true,
    },
  })

  return NextResponse.json({
    preferredProvider: user?.preferredAiProvider ?? null,
    providers: {
      anthropic: {
        hasKey: !!user?.anthropicApiKeyEncrypted,
        hasEnvFallback: !!process.env.ANTHROPIC_API_KEY,
      },
      openai: {
        hasKey: !!user?.openaiApiKeyEncrypted,
        hasEnvFallback: !!process.env.OPENAI_API_KEY,
      },
      gemini: {
        hasKey: !!user?.geminiApiKeyEncrypted,
        hasEnvFallback: !!process.env.GEMINI_API_KEY,
      },
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { provider?: string; apiKey?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = body.provider as AiProvider
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // BYOK is a paid-tier feature. Free users cannot save their own keys.
  const plan = await getUserPlan(session.user.id)
  if (!isByokAllowed(plan.type)) {
    return NextResponse.json({
      error: 'Bring-your-own API key is available on Lite and Pro plans. Upgrade to add your own key.',
    }, { status: 403 })
  }

  const apiKey = (body.apiKey || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 400 })

  const validationError = validateKey(provider, apiKey)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { [encryptedFieldFor(provider)]: encrypt(apiKey) },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { provider?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = body.provider as AiProvider
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredAiProvider: true },
  })

  const data: Record<string, null | string> = { [encryptedFieldFor(provider)]: null }
  // If removing the preferred provider's key, clear the preference too
  if (user?.preferredAiProvider === provider) data.preferredAiProvider = null

  await prisma.user.update({ where: { id: session.user.id }, data })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { preferredProvider?: string | null }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const preferred = body.preferredProvider ?? null
  if (preferred !== null && !PROVIDERS.includes(preferred as AiProvider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredAiProvider: preferred },
  })

  return NextResponse.json({ ok: true })
}
