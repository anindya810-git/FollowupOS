import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { geminiApiKeyEncrypted: true },
  })

  const apiKey = user?.geminiApiKeyEncrypted
    ? decrypt(user.geminiApiKeyEncrypted)
    : process.env.GEMINI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 400 })
  }

  // Try both v1 and v1beta to see what's available
  const results: Record<string, unknown> = {}
  for (const version of ['v1', 'v1beta']) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}&pageSize=50`
      )
      const data = await res.json()
      results[version] = res.ok
        ? (data.models ?? []).map((m: { name: string; supportedGenerationMethods?: string[] }) => ({
            name: m.name,
            methods: m.supportedGenerationMethods,
          }))
        : { error: data.error?.message ?? 'Unknown error' }
    } catch (e) {
      results[version] = { error: String(e) }
    }
  }

  return NextResponse.json(results)
}
