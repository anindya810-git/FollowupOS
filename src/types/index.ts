export type Category =
  | 'reply_needed'
  | 'waiting_on_them'
  | 'followup_due'
  | 'commitment_detected'
  | 'overdue_commitment'
  | 'no_action_needed'

export type Status = 'open' | 'snoozed' | 'done' | 'ignored'
export type Priority = 'high' | 'medium' | 'low'

export interface AiClassificationOutput {
  primary_category: Category
  secondary_categories: Category[]
  confidence: number
  reason: string
  suggested_action: string
  priority: Priority
  due_date: string | null
  owner_type: 'user' | 'other_person' | 'unclear'
  owner_name: string | null
  owner_email: string | null
  commitment_text: string | null
  is_automated_or_marketing: boolean
  should_show_to_user: boolean
  needs_closure: boolean
}

export interface EmailMessageInput {
  from: string
  to: string[]
  sent_at: string
  is_from_user: boolean
  body_excerpt: string
}

export interface ClassificationInput {
  user_email: string
  current_date: string
  timezone: string
  thread_subject: string
  messages: EmailMessageInput[]
  user_preferences: {
    default_followup_days: number
    conservative_mode: boolean
  }
}

export interface DashboardSummary {
  reply_needed: number
  followup_due: number
  waiting_on_them: number
  overdue_commitments: number
  high_priority: number
  snoozed: number
}

export interface ActionItemWithThread {
  id: string
  userId: string
  emailThreadId: string | null
  source: string
  category: string
  status: string
  priority: string
  title: string | null
  reason: string | null
  suggestedAction: string | null
  dueDate: string | null
  ownerType: string | null
  ownerName: string | null
  ownerEmail: string | null
  confidenceScore: number | null
  lastActivityAt: Date | null
  snoozedUntil: string | null
  completedAt: Date | null
  repeatedAskCount: number
  needsClosure: boolean
  autoReplySuggestion: string | null
  calendarEventId: string | null
  calendarEventProvider: string | null
  calendarTaskId: string | null
  calendarTaskProvider: string | null
  followupStep: number
  createdAt: Date
  updatedAt: Date
  emailThread?: {
    id: string
    subject: string | null
    providerUrl: string | null
    lastMessageAt: Date | null
    participants: string | null
    emailAccount?: { provider: string; emailAddress: string } | null
    messages?: Array<{
      senderEmail: string | null
      senderName: string | null
      snippet: string | null
      bodyExcerpt: string | null
      sentAt: Date | null
      isFromUser: boolean
      linksJson: string | null
      attachmentsJson: string | null
    }>
  } | null
}

export interface ExtractedLink { url: string; text: string }
export interface ExtractedAttachment {
  filename: string
  mimeType?: string
  sizeBytes?: number
  attachmentId?: string
}
