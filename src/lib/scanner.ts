import { prisma } from './prisma'
import { getGmailClient, getGmailThreadUrl, isNoisyThread, getMessageBody } from './gmail'
import { getOutlookAccessToken, getOutlookThreads, isNoisyOutlookMessage } from './outlook'
import { getImapThreads, isNoisyImapSender } from './imap'
import { classifyThread, generateQuickSuggestion, resolveAiConfig, MissingAiConfigError } from './ai'
import { canMakeAiCall, getUserPlan, PLAN_LIMITS } from './plan'
import type { AiConfig } from './ai'
import { upsertContact } from './contacts'
import { maybeAutoCreateCalendar } from './auto-calendar'
import { extractLinksFromText, extractGmailAttachments, extractImapAttachments } from './email-extract'
import type { ClassificationInput } from '@/types'
import crypto from 'crypto'

function countRepeatedAsks(messages: Array<{ is_from_user: boolean; from: string }>): number {
  let count = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!messages[i].is_from_user) count++
    else break
  }
  return count
}

export async function runInitialScan(jobId: string, userId: string, emailAccountId: string, scanWindowDays?: number, maxThreads?: number) {
  try {
    await prisma.scanJob.update({ where: { id: jobId }, data: { status: 'running' } })

    const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
    if (!account) throw new Error('Email account not found')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    // Derive plan-based defaults when caller didn't specify (e.g. direct callback invocation).
    // This ensures the Gmail OAuth callback uses the same limits as the /api/scan/start route.
    if (scanWindowDays === undefined || maxThreads === undefined) {
      const plan = await getUserPlan(userId)
      const limits = PLAN_LIMITS[plan.type]
      if (scanWindowDays === undefined) scanWindowDays = limits.scanWindowDays
      if (maxThreads === undefined && limits.maxThreadsPerScan !== -1) maxThreads = limits.maxThreadsPerScan
    }

    const aiConfig = await resolveAiConfig(userId)
    if (!aiConfig) {
      throw new MissingAiConfigError()
    }

    // Quota gate — only applies when using Pendingly's default key.
    const quota = await canMakeAiCall(userId, aiConfig.isDefaultKey)
    if (!quota.ok) {
      await prisma.scanJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMessage: quota.reason || 'AI quota exceeded' },
      })
      return
    }

    const appSettings = await prisma.appSettings.findUnique({ where: { userId } })

    const userPreferences = {
      default_followup_days: appSettings?.defaultFollowupDays ?? 3,
      conservative_mode: false,
    }
    // Resolve per-inbox overrides on top of the account-wide defaults.
    // noiseFilterLevel: inbox override wins; else global; else 3.
    // scanInstructions: global + per-inbox are combined (additive).
    const globalNoiseLevel = (appSettings as { noiseFilterLevel?: number } | null)?.noiseFilterLevel ?? 3
    const inboxNoiseLevel = (account as { noiseFilterLevel?: number | null }).noiseFilterLevel
    const noiseFilterLevel: number = (inboxNoiseLevel ?? globalNoiseLevel)

    const globalInstructions = (appSettings as { scanInstructions?: string | null } | null)?.scanInstructions ?? null
    const inboxInstructions = (account as { scanInstructions?: string | null }).scanInstructions ?? null
    const scanInstructions: string | null = [globalInstructions, inboxInstructions]
      .map(s => s?.trim())
      .filter(Boolean)
      .join('\n\n') || null

    if (account.provider === 'outlook') {
      await scanOutlookAccount({
        jobId,
        userId,
        emailAccountId,
        userEmail: account.emailAddress,
        userTimezone: user.timezone,
        userPreferences,
        scanWindowDays: scanWindowDays!,
        maxThreads,
        aiConfig,
        noiseFilterLevel,
        scanInstructions,
      })
      return
    }

    if (account.provider === 'zoho' || account.provider === 'apple' || account.provider === 'imap') {
      await scanImapAccount({
        jobId,
        userId,
        emailAccountId,
        userEmail: account.emailAddress,
        userTimezone: user.timezone,
        userPreferences,
        scanWindowDays: scanWindowDays!,
        maxThreads,
        aiConfig,
        noiseFilterLevel,
        scanInstructions,
      })
      return
    }

    // Gmail path
    const gmail = await getGmailClient(emailAccountId)

    // Pre-flight: verify the access token still works. If it doesn't, mark
    // the account expired and fail the scan with a clear reconnect message
    // instead of silently completing with zero items.
    let profileHistoryId: string | undefined
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' })
      profileHistoryId = profile.data.historyId ?? undefined
    } catch (e) {
      const code = (e as { code?: number }).code
      if (code === 401 || code === 403) {
        await prisma.emailAccount.update({
          where: { id: emailAccountId },
          data: { connectedStatus: 'expired' },
        })
        throw new Error('Your Gmail connection has expired. Reconnect it from Settings → Connected Inboxes, then re-run the scan.')
      }
      throw e
    }

    // Incremental sync: if we have a stored historyId, use Gmail's History API
    // to fetch only threads with new messages since the last scan.
    // Fall back to a full date-range scan if historyId is missing or expired (>~30 days old).
    let allThreadIds: string[] = []
    let usedIncremental = false

    if (account.gmailHistoryId) {
      try {
        let pageToken: string | undefined
        const changedThreadIds = new Set<string>()
        do {
          const histRes = await gmail.users.history.list({
            userId: 'me',
            startHistoryId: account.gmailHistoryId,
            historyTypes: ['messageAdded'],
            maxResults: 500,
            pageToken,
          })
          for (const record of histRes.data.history || []) {
            for (const msg of record.messagesAdded || []) {
              if (msg.message?.threadId) changedThreadIds.add(msg.message.threadId)
            }
          }
          pageToken = histRes.data.nextPageToken ?? undefined
        } while (pageToken)

        allThreadIds = Array.from(changedThreadIds)
        usedIncremental = true
      } catch (e) {
        // historyId expired (HTTP 404) or invalid — fall through to full scan
        const code = (e as { code?: number; status?: number }).code ?? (e as { status?: number }).status
        if (code !== 404) throw e
      }
    }

    if (!usedIncremental) {
      const afterDate = new Date()
      afterDate.setDate(afterDate.getDate() - scanWindowDays)
      const afterTimestamp = Math.floor(afterDate.getTime() / 1000)

      // Try Gmail's Primary category first — this excludes Promotions, Social,
      // Updates and Forums at the API level, so we only fetch real conversations.
      // Fall back to the full inbox query if Primary returns nothing (some accounts
      // have everything auto-categorised out of Primary).
      const fetchThreadIds = async (q: string) => {
        const ids: string[] = []
        let pageToken: string | undefined
        do {
          const res = await gmail.users.threads.list({ userId: 'me', q, maxResults: 100, pageToken })
          ids.push(...(res.data.threads || []).map(t => t.id!).filter(Boolean))
          pageToken = res.data.nextPageToken || undefined
        } while (pageToken && ids.length < 500)
        return ids
      }

      allThreadIds = await fetchThreadIds(
        `after:${afterTimestamp} -in:spam -in:trash category:primary`
      )

      if (allThreadIds.length === 0) {
        // Primary was empty — fall back to full inbox (all tabs)
        allThreadIds = await fetchThreadIds(
          `after:${afterTimestamp} -in:spam -in:trash`
        )
      }
    }

    // Onboarding quick-scan: cap threads so the scan finishes within Vercel's
    // 60 s Hobby timeout (12 threads × 4.2 s Gemini gap ≈ 50 s).
    if (maxThreads && allThreadIds.length > maxThreads) {
      allThreadIds = allThreadIds.slice(0, maxThreads)
    }

    await prisma.scanJob.update({
      where: { id: jobId },
      data: { threadsFound: allThreadIds.length },
    })

    let processed = 0
    let created = 0
    let aiFailures = 0
    let noiseFiltered = 0
    const aiErrorSamples: string[] = []

    // Default (free-tier) Gemini key: 15 RPM — must stay sequential so the
    // slot-reservation rate limiter can space calls 4.2 s apart without
    // concurrent callers all reserving slots and flooding the API.
    // BYOK keys (paid tiers) have much higher limits, so parallel is fine.
    const BATCH_SIZE = aiConfig.isDefaultKey ? 1 : 5
    for (let i = 0; i < allThreadIds.length; i += BATCH_SIZE) {
      const batch = allThreadIds.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(threadId => processThread({
          gmail,
          threadId,
          userId,
          emailAccountId,
          userEmail: account.emailAddress,
          userTimezone: user.timezone,
          userPreferences,
          provider: account.provider,
          aiConfig,
          noiseFilterLevel,
          scanInstructions,
        }))
      )

      for (const r of batchResults) {
        processed++
        if (r.status === 'fulfilled') {
          if (r.value === 'created') created++
          else if (r.value === 'ai_failed') aiFailures++
          else if (r.value === 'noise') noiseFiltered++
        } else {
          aiFailures++
          if (aiErrorSamples.length < 3) {
            aiErrorSamples.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
          }
        }
      }

      // Update progress after every batch, including running error diagnostic
      // so that if the scan is cancelled mid-flight the error info is preserved.
      const runningDiagnostic = aiFailures > 0
        ? `${aiFailures} AI failure${aiFailures === 1 ? '' : 's'} — ${aiErrorSamples[0] ?? 'unknown error'}`
        : null
      await prisma.scanJob.update({
        where: { id: jobId },
        data: {
          threadsProcessed: processed,
          actionItemsCreated: created,
          ...(runningDiagnostic !== null ? { errorMessage: runningDiagnostic } : {}),
        },
      })
    }

    await prisma.emailAccount.update({
      where: { id: emailAccountId },
      data: {
        initialScanCompleted: true,
        lastSyncedAt: new Date(),
        // Store historyId captured at scan-start so the next sync only sees new
        // changes — but ONLY if every thread classified cleanly. If any AI call
        // failed (e.g. provider outage / bad model), keep the old historyId so the
        // next sync re-fetches and retries those threads instead of skipping past
        // them forever.
        ...(profileHistoryId && aiFailures === 0 ? { gmailHistoryId: profileHistoryId } : {}),
      },
    })

    const aiClassified = processed - noiseFiltered - aiFailures
    let scanDiagnostic: string | null = null
    if (aiFailures > 0) {
      const sample = aiErrorSamples[0] ?? 'unknown error'
      scanDiagnostic = `${aiFailures} AI failures — ${sample}`
    } else if (noiseFiltered > 0) {
      scanDiagnostic = `${noiseFiltered} noise-filtered · ${aiClassified} AI-classified`
    }
    // Only mark completed if the job hasn't already been cancelled by the user.
    await prisma.scanJob.updateMany({
      where: { id: jobId, status: { not: 'failed' } },
      data: {
        status: 'completed',
        threadsProcessed: processed,
        actionItemsCreated: created,
        errorMessage: scanDiagnostic,
      },
    })
  } catch (error) {
    const friendly = error instanceof MissingAiConfigError
      ? 'AI is not configured. Add an API key in Settings → AI Provider, or the admin can set GEMINI_API_KEY for a free-tier default. Then re-run the scan.'
      : error instanceof Error ? error.message : 'Unknown error'
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: friendly,
      },
    })
  }
}

async function scanOutlookAccount(params: {
  jobId: string
  userId: string
  emailAccountId: string
  userEmail: string
  userTimezone: string
  scanInstructions?: string | null
  userPreferences: { default_followup_days: number; conservative_mode: boolean }
  scanWindowDays: number
  maxThreads?: number
  aiConfig: AiConfig
  noiseFilterLevel?: number
  scanInstructions?: string | null
}) {
  const { jobId, userId, emailAccountId, userEmail, userTimezone, userPreferences, scanWindowDays, maxThreads, aiConfig, noiseFilterLevel, scanInstructions } = params

  let accessToken: string
  let threads
  try {
    accessToken = await getOutlookAccessToken(emailAccountId)
    threads = await getOutlookThreads(accessToken, userEmail, scanWindowDays)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('401') || msg.includes('invalid_grant') || msg.includes('refresh token')) {
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { connectedStatus: 'expired' },
      })
      throw new Error('Your Outlook connection has expired. Reconnect it from Settings → Connected Inboxes, then re-run the scan.')
    }
    throw e
  }

  // Apply thread cap
  if (maxThreads && threads.length > maxThreads) {
    threads = threads.slice(0, maxThreads)
  }

  await prisma.scanJob.update({
    where: { id: jobId },
    data: { threadsFound: threads.length },
  })

  let processed = 0
  let created = 0
  let aiFailures = 0

  for (const thread of threads) {
    try {
      // Check ignored senders (use last message sender)
      const lastMsg = thread.messages[thread.messages.length - 1]
      const senderEmail: string = lastMsg?.from?.emailAddress?.address ?? ''

      const ignoredSender = await prisma.ignoredSender.findFirst({
        where: {
          userId,
          OR: [
            { senderEmail },
            { domain: senderEmail.split('@')[1] },
          ],
        },
      })
      if (ignoredSender) {
        processed++
        continue
      }

      // Noise filter using categories from the raw message (categories not in OutlookThread, so pass empty)
      if (isNoisyOutlookMessage(senderEmail, [], thread.subject || '', noiseFilterLevel)) {
        processed++
        continue
      }

      // Compute thread hash
      const threadHash = crypto
        .createHash('md5')
        .update(`${thread.conversationId}-${thread.messages.length}-${lastMsg?.id || ''}`)
        .digest('hex')

      // Check if thread already exists and hasn't changed
      const existingThread = await prisma.emailThread.findUnique({
        where: { emailAccountId_providerThreadId: { emailAccountId, providerThreadId: thread.conversationId } },
      })
      if (existingThread?.threadHash === threadHash) {
        processed++
        continue
      }

      const lastMessageAt = new Date(thread.lastMessageAt)

      // Upsert thread
      const upsertedThread = await prisma.emailThread.upsert({
        where: { emailAccountId_providerThreadId: { emailAccountId, providerThreadId: thread.conversationId } },
        create: {
          userId,
          emailAccountId,
          providerThreadId: thread.conversationId,
          subject: thread.subject,
          participants: JSON.stringify(thread.participants),
          lastMessageAt,
          lastMessageFromUser: thread.lastMessageFromUser,
          providerUrl: thread.providerUrl,
          // Set only after a successful classification (see below) so a failed
          // AI call doesn't permanently mark the thread "seen".
          threadHash: null,
        },
        update: {
          subject: thread.subject,
          participants: JSON.stringify(thread.participants),
          lastMessageAt,
          lastMessageFromUser: thread.lastMessageFromUser,
          threadHash: null,
          updatedAt: new Date(),
        },
      })

      // Build classification input — full thread (cap each body at 4000 chars)
      const messageInputs = thread.messages.map(msg => {
        const fromEmail = msg.from?.emailAddress?.address ?? ''
        const toEmails = (msg.toRecipients || []).map(r => r.emailAddress?.address ?? '')
        const isFromUser = fromEmail.toLowerCase() === userEmail.toLowerCase()
        const bodyText = (msg.body?.content || msg.bodyPreview || '').substring(0, 4000)
        return {
          from: fromEmail,
          to: toEmails,
          sent_at: msg.receivedDateTime,
          is_from_user: isFromUser,
          body_excerpt: bodyText,
        }
      })

      // Persist messages
      for (const msg of thread.messages) {
        if (!msg.id) continue
        const fromEmail = msg.from?.emailAddress?.address ?? ''
        const fromName = msg.from?.emailAddress?.name ?? null
        const isFromUser = fromEmail.toLowerCase() === userEmail.toLowerCase()
        const bodyText = (msg.body?.content || msg.bodyPreview || '').substring(0, 4000)
        const recipients = (msg.toRecipients || []).map(r => r.emailAddress?.address ?? '').join(', ')
        const links = extractLinksFromText(bodyText)
        // Outlook only exposes hasAttachments at scan time; the file list
        // lives on a separate /attachments endpoint. Stub it so the UI can
        // surface a "has attachments — open in Outlook" chip.
        const attachments = msg.hasAttachments
          ? [{ filename: '(see in Outlook)' }]
          : []
        await prisma.emailMessage.upsert({
          where: {
            emailThreadId_providerMessageId: {
              emailThreadId: upsertedThread.id,
              providerMessageId: msg.id,
            },
          },
          create: {
            userId,
            emailThreadId: upsertedThread.id,
            providerMessageId: msg.id,
            rfcMessageId: msg.internetMessageId || null,
            senderEmail: fromEmail,
            senderName: fromName,
            recipients,
            sentAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : null,
            snippet: msg.bodyPreview || '',
            bodyExcerpt: bodyText,
            isFromUser,
            linksJson: links.length ? JSON.stringify(links) : null,
            attachmentsJson: attachments.length ? JSON.stringify(attachments) : null,
          },
          update: {
            rfcMessageId: msg.internetMessageId || null,
            senderEmail: fromEmail,
            senderName: fromName,
            recipients,
            sentAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : null,
            snippet: msg.bodyPreview || '',
            bodyExcerpt: bodyText,
            isFromUser,
            linksJson: links.length ? JSON.stringify(links) : null,
            attachmentsJson: attachments.length ? JSON.stringify(attachments) : null,
          },
        })
      }

      const classificationInput: ClassificationInput = {
        user_email: userEmail,
        current_date: new Date().toISOString().split('T')[0],
        timezone: userTimezone,
        thread_subject: thread.subject,
        messages: messageInputs,
        user_preferences: userPreferences,
      }

      const inputHash = crypto.createHash('md5').update(JSON.stringify(classificationInput)).digest('hex')
      const result = await classifyThread(classificationInput, aiConfig, scanInstructions)

      // PII note: outputJson contains AI-extracted names/dates from email content.
      // Consider a retention policy (e.g. purge rows older than 90 days) for production.
      await prisma.aiClassificationLog.create({
        data: {
          userId,
          emailThreadId: upsertedThread.id,
          modelProvider: aiConfig.provider,
          modelName: aiConfig.model,
          inputHash,
          outputJson: result ? JSON.stringify(result) : null,
          confidenceScore: result?.confidence ?? null,
          errorMessage: result ? null : 'Classification failed',
          usedDefaultKey: aiConfig.isDefaultKey,
          callType: 'classify',
        },
      })

      if (!result) {
        // Leave threadHash null so this thread is retried on the next sync.
        aiFailures++
        processed++
        continue
      }
      // Classification succeeded — record the hash so this state is skipped next sync.
      await prisma.emailThread.update({ where: { id: upsertedThread.id }, data: { threadHash } })
      if (!result.should_show_to_user || result.primary_category === 'no_action_needed') {
        processed++
        continue
      }

      // Create or update action item
      const existingAction = await prisma.actionItem.findFirst({
        where: { userId, emailThreadId: upsertedThread.id, status: { in: ['open', 'snoozed'] } },
      })

      const outlookRepeatedAskCount = countRepeatedAsks(messageInputs)
      const outlookNeedsClosure = result.needs_closure ?? false

      let outlookAutoReplySuggestion: string | null = null
      if (
        result.primary_category === 'reply_needed' &&
        (outlookRepeatedAskCount >= 2 || result.priority === 'high')
      ) {
        outlookAutoReplySuggestion = await generateQuickSuggestion({
          threadSubject: thread.subject,
          reason: result.reason,
          messages: messageInputs.map(m => ({ from: m.from, body: m.body_excerpt, isFromUser: m.is_from_user, sentAt: m.sent_at })),
          repeatedAskCount: outlookRepeatedAskCount,
          userName: userEmail,
          config: aiConfig,
        })
      }

      const actionData = {
        category: result.primary_category,
        priority: result.priority,
        title: thread.subject,
        reason: result.reason,
        suggestedAction: result.suggested_action,
        dueDate: result.due_date,
        ownerType: result.owner_type,
        ownerName: result.owner_name,
        ownerEmail: result.owner_email,
        confidenceScore: result.confidence,
        lastActivityAt: lastMessageAt,
        repeatedAskCount: outlookRepeatedAskCount,
        needsClosure: outlookNeedsClosure,
        ...(outlookAutoReplySuggestion ? { autoReplySuggestion: outlookAutoReplySuggestion } : {}),
      }

      let createdActionId: string | null = null
      if (existingAction) {
        await prisma.actionItem.update({ where: { id: existingAction.id }, data: actionData })
      } else {
        const created = await prisma.actionItem.create({
          data: {
            userId,
            emailThreadId: upsertedThread.id,
            source: 'outlook',
            status: 'open',
            ...actionData,
          },
        })
        createdActionId = created.id
      }
      if (createdActionId) await maybeAutoCreateCalendar(userId, createdActionId)

      if (result.owner_email && result.owner_name) {
        await upsertContact(userId, result.owner_email, result.owner_name)
      }

      created++
      processed++

      if (processed % 3 === 0) {
        await prisma.scanJob.update({
          where: { id: jobId },
          data: { threadsProcessed: processed, actionItemsCreated: created },
        })
      }
    } catch {
      // Skip failed threads
      processed++
    }
  }

  await prisma.emailAccount.update({
    where: { id: emailAccountId },
    data: { initialScanCompleted: true, lastSyncedAt: new Date() },
  })

  await prisma.scanJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      threadsProcessed: processed,
      actionItemsCreated: created,
      errorMessage: (processed > 5 && aiFailures > processed / 2)
        ? `AI classification failed for ${aiFailures} of ${processed} threads. Check your API key has credit and isn't rate-limited, or switch provider in Settings.`
        : null,
    },
  })
}

async function scanImapAccount(params: {
  jobId: string
  userId: string
  emailAccountId: string
  userEmail: string
  userTimezone: string
  userPreferences: { default_followup_days: number; conservative_mode: boolean }
  scanWindowDays: number
  scanInstructions?: string | null
  maxThreads?: number
  aiConfig: AiConfig
  noiseFilterLevel?: number
  scanInstructions?: string | null
}) {
  const { jobId, userId, emailAccountId, userEmail, userTimezone, userPreferences, scanWindowDays, maxThreads, aiConfig, noiseFilterLevel, scanInstructions } = params

  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account) throw new Error('Email account not found')

  let threads = await getImapThreads(emailAccountId, scanWindowDays)

  // Apply thread cap
  if (maxThreads && threads.length > maxThreads) {
    threads = threads.slice(0, maxThreads)
  }

  await prisma.scanJob.update({
    where: { id: jobId },
    data: { threadsFound: threads.length },
  })

  let processed = 0
  let created = 0
  let aiFailures = 0

  for (const thread of threads) {
    try {
      // Check ignored senders
      const latestMsg = thread.messages[0]
      const senderEmail = latestMsg?.from ?? ''

      const ignoredSender = await prisma.ignoredSender.findFirst({
        where: {
          userId,
          OR: [
            { senderEmail },
            { domain: senderEmail.split('@')[1] },
          ],
        },
      })
      if (ignoredSender) {
        processed++
        continue
      }

      // Noise filter
      if (isNoisyImapSender(senderEmail, thread.subject, noiseFilterLevel)) {
        processed++
        continue
      }

      // Compute thread hash
      const threadHash = crypto
        .createHash('md5')
        .update(`${thread.threadId}-${thread.messages.length}-${latestMsg?.uid || ''}`)
        .digest('hex')

      // Check if thread already exists and hasn't changed
      const existingThread = await prisma.emailThread.findUnique({
        where: { emailAccountId_providerThreadId: { emailAccountId, providerThreadId: thread.threadId } },
      })
      if (existingThread?.threadHash === threadHash) {
        processed++
        continue
      }

      const lastMessageAt = new Date(thread.lastMessageAt)
      const imapProviderUrl = (() => {
        const tmpl = account.webmailSearchUrlTemplate
        if (tmpl && thread.subject) {
          const encoded = encodeURIComponent(thread.subject)
          if (tmpl.includes('{q}')) return tmpl.replace(/\{q\}/g, encoded)
          if (tmpl.includes('{query}')) return tmpl.replace(/\{query\}/g, encoded)
          return tmpl + encoded
        }
        return account.webmailBaseUrl ? account.webmailBaseUrl.replace(/\/+$/, '') : null
      })()

      // Upsert thread
      const upsertedThread = await prisma.emailThread.upsert({
        where: { emailAccountId_providerThreadId: { emailAccountId, providerThreadId: thread.threadId } },
        create: {
          userId,
          emailAccountId,
          provider: account.provider,
          providerThreadId: thread.threadId,
          subject: thread.subject,
          participants: JSON.stringify(thread.participants),
          lastMessageAt,
          lastMessageFromUser: thread.lastMessageFromUser,
          // Set only after a successful classification (see below).
          threadHash: null,
          providerUrl: imapProviderUrl,
        },
        update: {
          subject: thread.subject,
          participants: JSON.stringify(thread.participants),
          lastMessageAt,
          lastMessageFromUser: thread.lastMessageFromUser,
          threadHash: null,
          providerUrl: imapProviderUrl,
          updatedAt: new Date(),
        },
      })

      // Build classification input — full thread
      const messageInputs = thread.messages.map(msg => ({
        from: msg.from,
        to: msg.to,
        sent_at: msg.date,
        is_from_user: msg.isFromUser,
        body_excerpt: (msg.textBody || '').substring(0, 4000),
      }))

      // Persist messages
      for (const msg of thread.messages) {
        const providerMessageId = String(msg.uid)
        const imapLinks = extractLinksFromText(msg.textBody || '')
        const imapAttachments = extractImapAttachments(msg.bodyStructure as Parameters<typeof extractImapAttachments>[0])
        await prisma.emailMessage.upsert({
          where: {
            emailThreadId_providerMessageId: {
              emailThreadId: upsertedThread.id,
              providerMessageId,
            },
          },
          create: {
            userId,
            emailThreadId: upsertedThread.id,
            providerMessageId,
            rfcMessageId: msg.messageId || null,
            senderEmail: msg.from,
            senderName: msg.fromName || null,
            recipients: (msg.to || []).join(', '),
            sentAt: msg.date ? new Date(msg.date) : null,
            snippet: (msg.textBody || '').substring(0, 200),
            bodyExcerpt: (msg.textBody || '').substring(0, 4000),
            isFromUser: msg.isFromUser,
            linksJson: imapLinks.length ? JSON.stringify(imapLinks) : null,
            attachmentsJson: imapAttachments.length ? JSON.stringify(imapAttachments) : null,
          },
          update: {
            rfcMessageId: msg.messageId || null,
            senderEmail: msg.from,
            senderName: msg.fromName || null,
            recipients: (msg.to || []).join(', '),
            sentAt: msg.date ? new Date(msg.date) : null,
            snippet: (msg.textBody || '').substring(0, 200),
            bodyExcerpt: (msg.textBody || '').substring(0, 4000),
            isFromUser: msg.isFromUser,
            linksJson: imapLinks.length ? JSON.stringify(imapLinks) : null,
            attachmentsJson: imapAttachments.length ? JSON.stringify(imapAttachments) : null,
          },
        })
      }

      const classificationInput: ClassificationInput = {
        user_email: userEmail,
        current_date: new Date().toISOString().split('T')[0],
        timezone: userTimezone,
        thread_subject: thread.subject,
        messages: messageInputs,
        user_preferences: userPreferences,
      }

      const inputHash = crypto.createHash('md5').update(JSON.stringify(classificationInput)).digest('hex')
      const result = await classifyThread(classificationInput, aiConfig, scanInstructions)

      await prisma.aiClassificationLog.create({
        data: {
          userId,
          emailThreadId: upsertedThread.id,
          modelProvider: aiConfig.provider,
          modelName: aiConfig.model,
          inputHash,
          outputJson: result ? JSON.stringify(result) : null,
          confidenceScore: result?.confidence ?? null,
          errorMessage: result ? null : 'Classification failed',
          usedDefaultKey: aiConfig.isDefaultKey,
          callType: 'classify',
        },
      })

      if (!result) {
        // Leave threadHash null so this thread is retried on the next sync.
        aiFailures++
        processed++
        continue
      }
      // Classification succeeded — record the hash so this state is skipped next sync.
      await prisma.emailThread.update({ where: { id: upsertedThread.id }, data: { threadHash } })
      if (!result.should_show_to_user || result.primary_category === 'no_action_needed') {
        processed++
        continue
      }

      // Create or update action item
      const existingAction = await prisma.actionItem.findFirst({
        where: { userId, emailThreadId: upsertedThread.id, status: { in: ['open', 'snoozed'] } },
      })

      const imapRepeatedAskCount = countRepeatedAsks(messageInputs)
      const imapNeedsClosure = result.needs_closure ?? false

      let imapAutoReplySuggestion: string | null = null
      if (
        result.primary_category === 'reply_needed' &&
        (imapRepeatedAskCount >= 2 || result.priority === 'high')
      ) {
        imapAutoReplySuggestion = await generateQuickSuggestion({
          threadSubject: thread.subject,
          reason: result.reason,
          messages: messageInputs.map(m => ({ from: m.from, body: m.body_excerpt, isFromUser: m.is_from_user, sentAt: m.sent_at })),
          repeatedAskCount: imapRepeatedAskCount,
          userName: userEmail,
          config: aiConfig,
        })
      }

      const actionData = {
        category: result.primary_category,
        priority: result.priority,
        title: thread.subject,
        reason: result.reason,
        suggestedAction: result.suggested_action,
        dueDate: result.due_date,
        ownerType: result.owner_type,
        ownerName: result.owner_name,
        ownerEmail: result.owner_email,
        confidenceScore: result.confidence,
        lastActivityAt: lastMessageAt,
        repeatedAskCount: imapRepeatedAskCount,
        needsClosure: imapNeedsClosure,
        ...(imapAutoReplySuggestion ? { autoReplySuggestion: imapAutoReplySuggestion } : {}),
      }

      let createdActionId: string | null = null
      if (existingAction) {
        await prisma.actionItem.update({ where: { id: existingAction.id }, data: actionData })
      } else {
        const created = await prisma.actionItem.create({
          data: {
            userId,
            emailThreadId: upsertedThread.id,
            source: account.provider,
            status: 'open',
            ...actionData,
          },
        })
        createdActionId = created.id
      }
      if (createdActionId) await maybeAutoCreateCalendar(userId, createdActionId)

      if (result.owner_email && result.owner_name) {
        await upsertContact(userId, result.owner_email, result.owner_name)
      }

      created++
      processed++

      if (processed % 3 === 0) {
        await prisma.scanJob.update({
          where: { id: jobId },
          data: { threadsProcessed: processed, actionItemsCreated: created },
        })
      }
    } catch {
      // Skip failed threads
      processed++
    }
  }

  await prisma.emailAccount.update({
    where: { id: emailAccountId },
    data: { initialScanCompleted: true, lastSyncedAt: new Date() },
  })

  await prisma.scanJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      threadsProcessed: processed,
      actionItemsCreated: created,
      errorMessage: (processed > 5 && aiFailures > processed / 2)
        ? `AI classification failed for ${aiFailures} of ${processed} threads. Check your API key has credit and isn't rate-limited, or switch provider in Settings.`
        : null,
    },
  })
}

async function processThread(params: {
  gmail: ReturnType<typeof import('googleapis').google.gmail>
  threadId: string
  userId: string
  emailAccountId: string
  userEmail: string
  userTimezone: string
  userPreferences: { default_followup_days: number; conservative_mode: boolean }
  scanInstructions?: string | null
  provider?: string
  aiConfig: AiConfig
  noiseFilterLevel?: number
  scanInstructions?: string | null
}): Promise<'created' | 'skipped' | 'noise' | 'ai_failed'> {
  const { gmail, threadId, userId, emailAccountId, userEmail, userTimezone, userPreferences, provider = 'gmail', aiConfig, noiseFilterLevel, scanInstructions } = params

  let threadRes: Awaited<ReturnType<typeof gmail.users.threads.get>>
  try {
    threadRes = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
    })
  } catch (e: unknown) {
    // Thread was deleted or moved since the History API listed it — skip silently
    const code = (e as { code?: number })?.code ?? (e as { status?: number })?.status
    if (code === 404) return 'skipped'
    throw e
  }

  const thread = threadRes.data
  const messages = thread.messages || []
  if (messages.length === 0) return 'skipped'

  const firstMessage = messages[0]
  const headers = firstMessage.payload?.headers || []
  const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)'
  const labels = firstMessage.labelIds || []

  const senderEmail = (headers.find(h => h.name === 'From')?.value || '').replace(/.*<(.+)>/, '$1').trim()

  // Check ignored senders
  const ignoredSender = await prisma.ignoredSender.findFirst({
    where: {
      userId,
      OR: [
        { senderEmail: senderEmail },
        { domain: senderEmail.split('@')[1] },
      ],
    },
  })
  if (ignoredSender) return 'noise'

  if (isNoisyThread(labels, senderEmail, subject, noiseFilterLevel)) return 'noise'

  // Compute thread hash
  const lastMessage = messages[messages.length - 1]
  const threadHash = crypto
    .createHash('md5')
    .update(`${threadId}-${messages.length}-${lastMessage.id}`)
    .digest('hex')

  // Check if thread already exists and hasn't changed
  const existingThread = await prisma.emailThread.findUnique({
    where: { emailAccountId_providerThreadId: { emailAccountId, providerThreadId: threadId } },
  })
  if (existingThread?.threadHash === threadHash) return 'skipped'

  // Fetch full thread for classification
  let fullThreadRes: Awaited<ReturnType<typeof gmail.users.threads.get>>
  try {
    fullThreadRes = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    })
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code ?? (e as { status?: number })?.status
    if (code === 404) return 'skipped'
    throw e
  }

  const fullMessages = fullThreadRes.data.messages || []
  const participants = new Set<string>()
  let lastMessageFromUser = false

  const senderContactsToUpsert: Array<{ email: string; name: string | null }> = []
  const messagePersistData: Array<{
    providerMessageId: string
    rfcMessageId: string | null
    senderEmail: string
    senderName: string | null
    recipients: string
    sentAt: Date | null
    snippet: string
    bodyExcerpt: string
    isFromUser: boolean
    linksJson: string | null
    attachmentsJson: string | null
  }> = []

  const messageInputs = fullMessages.map(msg => {
    const msgHeaders = msg.payload?.headers || []
    const from = msgHeaders.find(h => h.name === 'From')?.value || ''
    const toRaw = msgHeaders.find(h => h.name === 'To')?.value || ''
    const to = toRaw.split(',')
    const dateHeader = msgHeaders.find(h => h.name === 'Date')?.value || ''
    const rfcMessageIdHeader = msgHeaders.find(h => (h.name || '').toLowerCase() === 'message-id')?.value || null
    const fromEmail = from.replace(/.*<(.+)>/, '$1').trim()
    const fromName = from.includes('<') ? from.replace(/<.*>/, '').trim().replace(/^["']|["']$/g, '') : null
    const isFromUser = fromEmail.toLowerCase() === userEmail.toLowerCase()
    const body = getMessageBody(msg.payload as Parameters<typeof getMessageBody>[0])

    // Prefer Gmail's authoritative internalDate (ms since epoch) over the
    // Date header which can be missing, malformed, or far in the past.
    const internalDateNum = msg.internalDate ? parseInt(msg.internalDate as unknown as string, 10) : NaN
    const sentAt = Number.isFinite(internalDateNum) && internalDateNum > 0
      ? new Date(internalDateNum)
      : (dateHeader ? new Date(dateHeader) : null)
    const sentAtStr = sentAt ? sentAt.toISOString() : ''

    participants.add(from)
    lastMessageFromUser = isFromUser

    if (fromEmail && !isFromUser) {
      senderContactsToUpsert.push({ email: fromEmail, name: fromName || null })
    }

    if (msg.id) {
      const gmailLinks = extractLinksFromText(body)
      const gmailAttachments = extractGmailAttachments(msg.payload as Parameters<typeof extractGmailAttachments>[0])
      messagePersistData.push({
        providerMessageId: msg.id,
        rfcMessageId: rfcMessageIdHeader,
        senderEmail: fromEmail,
        senderName: fromName,
        recipients: toRaw,
        sentAt,
        snippet: msg.snippet || '',
        bodyExcerpt: body.substring(0, 4000),
        isFromUser,
        linksJson: gmailLinks.length ? JSON.stringify(gmailLinks) : null,
        attachmentsJson: gmailAttachments.length ? JSON.stringify(gmailAttachments) : null,
      })
    }

    return {
      from: fromEmail,
      to,
      sent_at: sentAtStr,
      is_from_user: isFromUser,
      body_excerpt: body.substring(0, 4000),
    }
  })

  // Use the latest message's internalDate (set on each persistData entry) so
  // threads with missing/garbled Date headers aren't all stamped "now".
  const lastPersisted = messagePersistData[messagePersistData.length - 1]
  const lastMsgDate = lastPersisted?.sentAt || new Date()

  // Upsert thread
  const upsertedThread = await prisma.emailThread.upsert({
    where: { emailAccountId_providerThreadId: { emailAccountId, providerThreadId: threadId } },
    create: {
      userId,
      emailAccountId,
      providerThreadId: threadId,
      subject,
      participants: JSON.stringify(Array.from(participants)),
      lastMessageAt: lastMsgDate,
      lastMessageFromUser,
      providerUrl: getGmailThreadUrl(threadId),
      // threadHash is set only AFTER a successful classification (see below).
      // If we wrote it here and the AI call failed, the thread would be marked
      // "seen" and never retried on the next sync.
      threadHash: null,
    },
    update: {
      subject,
      participants: JSON.stringify(Array.from(participants)),
      lastMessageAt: lastMsgDate,
      lastMessageFromUser,
      threadHash: null,
      updatedAt: new Date(),
    },
  })

  // Persist messages (so on-demand replies and the drawer can show full context)
  for (const m of messagePersistData) {
    await prisma.emailMessage.upsert({
      where: {
        emailThreadId_providerMessageId: {
          emailThreadId: upsertedThread.id,
          providerMessageId: m.providerMessageId,
        },
      },
      create: {
        userId,
        emailThreadId: upsertedThread.id,
        providerMessageId: m.providerMessageId,
        rfcMessageId: m.rfcMessageId,
        senderEmail: m.senderEmail,
        senderName: m.senderName,
        recipients: m.recipients,
        sentAt: m.sentAt,
        snippet: m.snippet,
        bodyExcerpt: m.bodyExcerpt,
        isFromUser: m.isFromUser,
        linksJson: m.linksJson,
        attachmentsJson: m.attachmentsJson,
      },
      update: {
        rfcMessageId: m.rfcMessageId,
        senderEmail: m.senderEmail,
        senderName: m.senderName,
        recipients: m.recipients,
        sentAt: m.sentAt,
        snippet: m.snippet,
        bodyExcerpt: m.bodyExcerpt,
        isFromUser: m.isFromUser,
        linksJson: m.linksJson,
        attachmentsJson: m.attachmentsJson,
      },
    })
  }

  // AI Classification
  const classificationInput: ClassificationInput = {
    user_email: userEmail,
    current_date: new Date().toISOString().split('T')[0],
    timezone: userTimezone,
    thread_subject: subject,
    messages: messageInputs,
    user_preferences: userPreferences,
  }

  const inputHash = crypto.createHash('md5').update(JSON.stringify(classificationInput)).digest('hex')

  let result = null
  let classifyError: string | null = null
  try {
    result = await classifyThread(classificationInput, aiConfig, scanInstructions)
  } catch (e) {
    classifyError = e instanceof Error ? e.message : String(e)
  }

  await prisma.aiClassificationLog.create({
    data: {
      userId,
      emailThreadId: upsertedThread.id,
      modelProvider: aiConfig.provider,
      modelName: aiConfig.model,
      inputHash,
      outputJson: result ? JSON.stringify(result) : null,
      confidenceScore: result?.confidence ?? null,
      errorMessage: result ? null : (classifyError ?? 'Classification failed'),
      usedDefaultKey: aiConfig.isDefaultKey,
      callType: 'classify',
    },
  })

  if (!result) {
    // Throw so the scanner loop captures the real error in aiErrorSamples.
    // threadHash stays null, so this thread is retried on the next sync.
    throw new Error(classifyError ?? 'Classification failed')
  }
  // Classification succeeded — now it's safe to record the hash so this exact
  // thread state is skipped on future syncs.
  await prisma.emailThread.update({ where: { id: upsertedThread.id }, data: { threadHash } })
  if (!result.should_show_to_user || result.primary_category === 'no_action_needed') {
    return 'skipped'
  }

  // Create or update action item
  const existingAction = await prisma.actionItem.findFirst({
    where: { userId, emailThreadId: upsertedThread.id, status: { in: ['open', 'snoozed'] } },
  })

  const repeatedAskCount = countRepeatedAsks(messageInputs)
  const needsClosure = result.needs_closure ?? false

  // Pre-generate quick suggestion for threads demanding attention
  let autoReplySuggestion: string | null = null
  if (
    result.primary_category === 'reply_needed' &&
    (repeatedAskCount >= 2 || result.priority === 'high')
  ) {
    autoReplySuggestion = await generateQuickSuggestion({
      threadSubject: subject,
      reason: result.reason,
      messages: messageInputs.map(m => ({ from: m.from, body: m.body_excerpt, isFromUser: m.is_from_user, sentAt: m.sent_at })),
      repeatedAskCount,
      userName: userEmail,
      config: aiConfig,
    })
  }

  const actionData = {
    category: result.primary_category,
    priority: result.priority,
    title: subject,
    reason: result.reason,
    suggestedAction: result.suggested_action,
    dueDate: result.due_date,
    ownerType: result.owner_type,
    ownerName: result.owner_name,
    ownerEmail: result.owner_email,
    confidenceScore: result.confidence,
    lastActivityAt: lastMsgDate,
    repeatedAskCount,
    needsClosure,
    ...(autoReplySuggestion ? { autoReplySuggestion } : {}),
  }

  let createdActionId: string | null = null
  if (existingAction) {
    await prisma.actionItem.update({ where: { id: existingAction.id }, data: actionData })
  } else {
    const created = await prisma.actionItem.create({
      data: {
        userId,
        emailThreadId: upsertedThread.id,
        source: provider,
        status: 'open',
        ...actionData,
      },
    })
    createdActionId = created.id
  }
  if (createdActionId) await maybeAutoCreateCalendar(userId, createdActionId)

  // Upsert sender contacts from messages
  for (const sc of senderContactsToUpsert) {
    await upsertContact(userId, sc.email, sc.name)
  }

  // Upsert contact for action item owner
  if (result.owner_email && result.owner_name) {
    await upsertContact(userId, result.owner_email, result.owner_name)
  }

  return 'created'
}
