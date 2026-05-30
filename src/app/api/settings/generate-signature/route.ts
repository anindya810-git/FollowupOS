import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAiConfig } from '@/lib/ai'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, email: true, designation: true, company: true, phone: true,
      socialLinkedin: true, socialTwitter: true, socialInstagram: true,
      socialFacebook: true, socialSnapchat: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const socials = [
    user.socialLinkedin  && { label: 'LinkedIn',   url: user.socialLinkedin },
    user.socialTwitter   && { label: 'Twitter/X',  url: user.socialTwitter },
    user.socialInstagram && { label: 'Instagram',  url: user.socialInstagram },
    user.socialFacebook  && { label: 'Facebook',   url: user.socialFacebook },
    user.socialSnapchat  && { label: 'Snapchat',   url: user.socialSnapchat },
  ].filter(Boolean) as Array<{ label: string; url: string }>

  const profileLines = [
    user.name        && `Name: ${user.name}`,
    user.designation && `Title: ${user.designation}`,
    user.company     && `Company: ${user.company}`,
    user.phone       && `Phone: ${user.phone}`,
    user.email       && `Email: ${user.email}`,
    socials.length   && `Social: ${socials.map(s => `${s.label} (${s.url})`).join(', ')}`,
  ].filter(Boolean).join('\n')

  const prompt = `Generate a clean, professional HTML email signature for this person:

${profileLines}

Requirements:
- Use inline CSS only (no <style> blocks — email clients strip them)
- Two visual sections: left = name/title/company/contact, right = social icons row (if any)
- Name in bold ~14px, title/company in gray ~12px, contact line in gray ~11px
- Social links as small colored text badges (not images) — e.g. [in] [tw] [ig]
- A thin top border (1px solid #e5e7eb) as a separator above the signature
- Max width 480px, comfortable padding
- Clickable email and phone (mailto: and tel: links)
- Social URLs should be full clickable hrefs; if a social value is just a username (no http), prefix with the platform URL
- No marketing text, no "Sent via" footer, no images
- Output ONLY the raw HTML — no markdown, no code fences, no explanation`

  try {
    const config = await getAiConfig(session.user.id)
    let html = ''

    if (config.provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(config.apiKey)
      const model = genAI.getGenerativeModel({ model: config.model })
      const result = await model.generateContent(prompt)
      html = result.response.text().trim()
    } else if (config.provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: config.apiKey })
      const msg = await client.messages.create({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      html = (msg.content[0] as { type: string; text: string }).text.trim()
    } else {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: config.apiKey })
      const completion = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      })
      html = completion.choices[0]?.message?.content?.trim() ?? ''
    }

    // Strip accidental code fences the model might emit despite instructions
    html = html.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim()

    return NextResponse.json({ html })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
