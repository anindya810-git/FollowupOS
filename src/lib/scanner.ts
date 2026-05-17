import { prisma } from './prisma'
import { getGmailClient, getGmailThreadUrl, isNoisyThread, getMessageBody } from './gmail'
import { getOutlookAccessToken, getOutlookThreads, isNoisyOutlookMessage } from './outlook'
import { getImapThreads, isNoisyImapSender } from './imap'
import { classifyThread, generateQuickSuggestion, resolveAiConfig, MissingAiConfigError } from './ai'
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

export async function runInitialScan(jobId: string, userId: string, emailAccountId: string, scanWindowDays: number = 30) {
  try {
    await prisma.scanJob.update({ where: { id: jobId }, data: { status: 'running' } })

    const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
    if (!account) throw new Error('Email account not found')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    const aiConfig = await resolveAiConfig(userId)
    if (!aiConfig) {
      throw new MissingAiConfigError()
    }

    const appSettings = await prisma.appSettings.findUnique({ where: { userId } })

    const userPreferences = {
      default_followup_days: appSettings?.defaultFollowupDays ?? 3,
      conservative_mode: appSettings?.conservativeMode ?? true,
    }

    if (account.provider === 'outlook') {
      await scanOutlookAccount({
        jobId,
        userId,
        emailAccountId,
        userEmail: account.emailAddress,
        userTimezone: user.timezone,
        userPreferences,
        scanWindowDays,
        aiConfig,
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
        scanWindowDays,
        aiConfig,
      })
      return
    }

    // Gmail path
    const gmail = await getGmailClient(emailAccountId)

    // Pre-flight: verify the access token still works. If it doesn't, mark
    // the account expired and fail the scan with a clear reconnect message
    // instead of silently completing with zero items.
    try {
      await gmail.users.getProfile({ userId: 'me' })
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

    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - scanWindowDays)
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000)

    // Fetch threads
    let nextPageToken: string | undefined
    let allThreadIds: string[] = []

    do {
      const res = await gmail.users.threads.list({
        userId: 'me',
        q: `after:${afterTimestamp} -in:spam -in:trash`,
        maxResults: 100,
        pageToken: nextPageToken,
      })
      const threads = res.data.threads || []
      allThreadIds = allThreadIds.concat(threads.map(t => t.id!).filter(Boolean))
      nextPageToken = res.data.nextPageToken || undefined
    } while (nextPageToken && allThreadIds.length < 500)

    await prisma.scanJob.update({
      where: { id: jobId },
      data: { threadsFound: allThreadIds.length },
    })

    let processed = 0
    let created = 0
    let aiFailures = 0

    for (const threadId of allThreadIds) {
      try {
        const result = await processThread({
          gmail,
          threadId,
          userId,
          emailAccountId,
          userEmail: account.emailAddress,
          userTimezone: user.timezone,
          userPreferences,
          provider: account.provider,
          aiConfig,
        })
        if (result) created++
        processed++

        if (processed % 3 === 0) {
          await prisma.scanJob.update({
            where: { id: jobId },
            data: { threadsProcessed: processed, actionItemsCreated: created },
          })
        }
        // Rate limiting
        await new Promise(r => setTimeout(r, 100))
      } catch {
        // Skip failed threads but still count them so the progress denominator
        // matches threadsFound at the end.
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
  userPreferences: { default_followup_days: number; conservative_mode: boolean }
  scanWindowDays: number
  aiConfig: AiConfig
}) {
  const { jobId, userId, emailAccountId, userEmail, userTimezone, userPreferences, scanWindowDays, aiConfig } = params

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
      if (isNoisyOutlookMessage(senderEmail, [], thread.subject || '')) {
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
          threadHash,
        },
        update: {
          subject: thread.subject,
          participants: JSON.stringify(thread.participants),
          lastMessageAt,
          lastMessageFromUser: thread.lastMessageFromUser,
          threadHash,
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
      const result = await classifyThread(classificationInput, aiConfig)

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
        },
      })

      if (!result) aiFailures++
      if (!result || !result.should_show_to_user || result.primary_category === 'no_action_needed') {
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
  aiConfig: AiConfig
}) {
  const { jobId, userId, emailAccountId, userEmail, userTimezone, userPreferences, scanWindowDays, aiConfig } = params

  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account) throw new Error('Email account not found')

  const threads = await getImapThreads(emailAccountId, scanWindowDays)

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
      if (isNoisyImapSender(senderEmail, thread.subject)) {
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
          threadHash,
          providerUrl: imapProviderUrl,
        },
        update: {
          subject: thread.subject,
          participants: JSON.stringify(thread.participants),
          lastMessageAt,
          lastMessageFromUser: thread.lastMessageFromUser,
          threadHash,
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
      const result = await classifyThread(classificationInput, aiConfig)

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
        },
      })

      if (!result) aiFailures++
      if (!result || !result.should_show_to_user || result.primary_category === 'no_action_needed') {
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
  provider?: string
  aiConfig: AiConfig
}): Promise<boolean> {
  const { gmail, threadId, userId, emailAccountId, userEmail, userTimezone, userPreferences, provider = 'gmail', aiConfig } = params

  const threadRes = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
  })

  const thread = threadRes.data
  const messages = thread.messages || []
  if (messages.length === 0) return false

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
  if (ignoredSender) return false

  if (isNoisyThread(labels, senderEmail, subject)) return false

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
  if (existingThread?.threadHash === threadHash) return false

  // Fetch full thread for classification
  const fullThreadRes = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  })

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
      threadHash,
    },
    update: {
      subject,
      participants: JSON.stringify(Array.from(participants)),
      lastMessageAt: lastMsgDate,
      lastMessageFromUser,
      threadHash,
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

  const result = await classifyThread(classificationInput, aiConfig)

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
    },
  })

  if (!result || !result.should_show_to_user || result.primary_category === 'no_action_needed') {
    return false
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

  return true
}
