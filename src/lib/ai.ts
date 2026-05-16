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
  messages: Array<{ from: string; body: string; isFromUser: boolean; sentAt?: string }>
  repeatedAskCount: number
  userName: string
}): Promise<string | null> {
  const systemPrompt = `You are Pendingly, an AI assistant that writes intelligent, context-aware email replies.

Read the ENTIRE thread carefully — every message, in order. Understand:
- What the contact is actually asking, waiting for, or chasing
- What has already been promised, answered, or discussed earlier in the thread
- Whether the contact has been ignored repeatedly (be more apologetic if so)
- The relationship tone (formal vs casual) from prior messages
- Specific names, dates, amounts, deliverables, or commitments mentioned

Write a reply that:
- Directly addresses the specific ask or question, referencing details from the thread when relevant
- Acknowledges any prior promise the user made that hasn't been kept
- Proposes a concrete next step (a date, a deliverable, a meeting time, or a clear answer) — never vague
- Matches the tone established in the thread
- Is 2-5 sentences. Longer if the ask is complex, shorter if simple.
- Does NOT use filler ("I hope this finds you well", "Thanks for reaching out", "Sorry for the delay" unless the contact was chased multiple times)
- Does NOT invent facts, names, dates, or numbers that aren't in the thread
- Does NOT include a subject line, greeting like "Hi [Name]", or sign-off — just the body paragraph(s)

If you cannot determine a concrete answer from the thread, propose a clear next step (e.g. "Let me confirm with the team and revert by Thursday").

Output the reply text only. No JSON, no markdown, no quotes around it.`

  const prefix = params.repeatedAskCount >= 2
    ? `IMPORTANT: This contact has sent ${params.repeatedAskCount} consecutive messages without a reply from the user. The reply should briefly acknowledge the delay without over-apologizing, then give a concrete, useful response.\n\n`
    : ''

  const threadText = params.messages
    .map((m, i) => {
      const who = m.isFromUser ? `[Message ${i + 1}] You` : `[Message ${i + 1}] ${m.from}`
      const ts = m.sentAt ? ` (${m.sentAt})` : ''
      return `${who}${ts}:\n${m.body}`
    })
    .join('\n\n---\n\n')

  const userContent = `${prefix}Thread subject: "${params.threadSubject}"
Classifier note: ${params.reason}
User's name (signing as): ${params.userName}

FULL THREAD (chronological, oldest first):

${threadText}

Now write the reply body.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
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
  messages: Array<{ from: string; body: string; isFromUser: boolean; sentAt?: string }>
  tone: string
  outputType: string
  userName: string
}): Promise<{ draft: string; subject_suggestion: string } | null> {
  const systemPrompt = `You are Pendingly, an AI assistant that writes intelligent, context-aware professional email replies.

Read the ENTIRE thread carefully — every message, in order. Before writing, understand:
- What the contact is actually asking, waiting for, or chasing
- What has already been promised, answered, or committed to earlier in the thread
- Specific names, dates, deliverables, numbers, or decisions that were discussed
- The established tone of the relationship

Write a reply that:
- Directly addresses the specific request, referencing details from the thread when relevant
- Honours the requested tone strictly (polite/firm/short/executive/friendly/escalation)
- Proposes concrete next steps rather than vague reassurance
- Never invents facts, names, dates, or numbers not present in the thread
- Includes an appropriate greeting and sign-off matching the tone
- Is the right length for the situation — short for simple replies, longer when the ask is complex

Return ONLY valid JSON in this exact format:
{
  "subject_suggestion": "Re: [original subject]",
  "draft": "Your email message here including greeting and sign-off"
}`

  const threadText = params.messages
    .map((m, i) => {
      const who = m.isFromUser ? `[Message ${i + 1}] You` : `[Message ${i + 1}] ${m.from}`
      const ts = m.sentAt ? ` (${m.sentAt})` : ''
      return `${who}${ts}:\n${m.body}`
    })
    .join('\n\n---\n\n')

  const userContent = `Thread subject: ${params.threadSubject}
Classifier note: ${params.reason}
Suggested action: ${params.suggestedAction}
Requested tone: ${params.tone}
Output type: ${params.outputType}
User's name (signing as): ${params.userName}

FULL THREAD (chronological, oldest first):

${threadText}`

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
