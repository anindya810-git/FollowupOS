import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AiKeyClient } from './AiKeyClient'

export default async function AiKeyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      anthropicApiKeyEncrypted: true,
      openaiApiKeyEncrypted: true,
      geminiApiKeyEncrypted: true,
    },
  })

  const initialHasAnyKey = !!(
    user?.anthropicApiKeyEncrypted ||
    user?.openaiApiKeyEncrypted ||
    user?.geminiApiKeyEncrypted
  )

  const initialHasServerDefault = !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY
  )

  return (
    <AiKeyClient
      initialHasAnyKey={initialHasAnyKey}
      initialHasServerDefault={initialHasServerDefault}
    />
  )
}
