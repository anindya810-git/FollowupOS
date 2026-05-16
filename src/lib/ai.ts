import Anthropic from '@anthropic-ai/sdk'
import type { AiClassificationOutput, ClassificationInput } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CLASSIFICATION_SYSTEM_PROMPT = `You are Pendingly, an AI assistant that classifies email threads for follow-up management.

Your job is to decide whether a thread needs action from the user, whether the user is waiting for someone else, whether a follow-up is due, or whether no action is needed.

Be conservative. Do not show FYI, newsletters, marketing emails, automated emails, or already-closed conversations. Only show items where there is a clear or likely action needed.

Classify into exactly one primary_category:
- reply_needed: The latest meaningful message is from another person and appears to request information, confirmation, action, approval, decision, document, update, or response from the user
- waiting_on_them: The user previously asked another person for something and no meaningful response has been received
- followup_due: A waiting item has passed the user's follow-up threshold (default 3 business days)
- commitment_detected: Someone committed to doing something by a specific or implied date
- overdue_commitment: A detected commitment has passed its due date and there is no evidence of completion
- no_action_needed: FYI only, automated mail, newsletter, closed thread, or already resolved

Use the current date and timezone to determine overdue commitments and follow-up thresholds.

Set "needs_closure" to true when the thread appears to be naturally concluded — both parties acknowledged completion, said thanks, or the matter is resolved — but it is still open. This signals the user can safely archive or close it.

Return ONLY valid JSON matching this exact schema. Do not include markdown or explanations outside JSON:
{
  "primary_category": "reply_needed|waiting_on_them|followup_due|commitment_detected|overdue_commitment|no_action_needed",
  "secondary_categories": [],
  "confidence": 0.0,
  "reason": "Short explanation of why this needs attention",
  "suggested_action": "What the user should do next",
  "priority": "high|medium|low",
  "due_date": "YYYY-MM-DD or null",
  "owner_type": "user|other_person|unclear",
  "owner_name": "Name or null",
  "owner_email": "email or null",
  "commitment_text": "Relevant commitment text or null",
  "is_automated_or_marketing": false,
  "should_show_to_user": true,
  "needs_closure": false
}`

export async function classifyThread(input: ClassificationInput): Promise<AiClassificationOutput | null> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as AiClassificationOutput

    // Validate required fields
    const validCategories = ['reply_needed', 'waiting_on_them', 'followup_due', 'commitment_detected', 'overdue_commitment', 'no_action_needed']
    const validPriorities = ['high', 'medium', 'low']

    if (!validCategories.includes(parsed.primary_category)) return null
    if (!validPriorities.includes(parsed.priority)) return null
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) return null
    if (typeof parsed.should_show_to_user !== 'boolean') return null
    if (typeof parsed.needs_closure !== 'boolean') parsed.needs_closure = false

    return parsed
  } catch {
    return null
  }
}

export async function generateQuickSuggestion(params: {
  threadSubject: string
  reason: string
  messages: Array<{ from: string; body: string; isFromUser: boolean }>
  repeatedAskCount: number
  userName: string
}): Promise<string | null> {
  const systemPrompt = `You are Pendingly. Write a single short paragraph (2-3 sentences max) as a polite reply suggestion that directly addresses what the contact is asking or waiting for. Be warm but professional. Do not use placeholder text. Do not start with "I hope this message finds you well" or similar filler.`

  const prefix = params.repeatedAskCount >= 2
    ? `This contact has sent ${params.repeatedAskCount} messages without a reply. `
    : ''

  const userContent = `${prefix}Thread: "${params.threadSubject}"
Reason for action: ${params.reason}
User name: ${params.userName}

Recent messages (latest last):
${params.messages.slice(-4).map(m => `${m.isFromUser ? 'You' : m.from}: ${m.body.substring(0, 400)}`).join('\n\n')}

Write only the reply text, no subject line, no JSON.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return text || null
  } catch {
    return null
  }
}

export async function generateDraft(params: {
  threadSubject: string
  reason: string
  suggestedAction: string
  messages: Array<{ from: string; body: string; isFromUser: boolean }>
  tone: string
  outputType: string
  userName: string
}): Promise<{ draft: string; subject_suggestion: string } | null> {
  const systemPrompt = `You are Pendingly, an assistant that writes concise professional follow-up messages.

Use the provided thread context and suggested action. Generate a message in the requested tone. Do not invent facts. Keep the message clear, polite, and action-oriented.

Return ONLY valid JSON in this exact format:
{
  "subject_suggestion": "Re: [original subject]",
  "draft": "Your email message here"
}`

  const userContent = `Thread Subject: ${params.threadSubject}
Reason for action: ${params.reason}
Suggested action: ${params.suggestedAction}
Tone: ${params.tone}
Output type: ${params.outputType}
User name: ${params.userName}

Recent messages:
${params.messages.slice(-5).map(m => `${m.isFromUser ? 'You' : m.from}: ${m.body.substring(0, 500)}`).join('\n\n')}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(text) as { draft: string; subject_suggestion: string }
  } catch {
    return null
  }
}
