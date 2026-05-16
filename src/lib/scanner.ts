import { prisma } from './prisma'
import { getGmailClient, getGmailThreadUrl, isNoisyThread, getMessageBody } from './gmail'
import { getOutlookAccessToken, getOutlookThreads, isNoisyOutlookMessage } from './outlook'
import { getImapThreads, isNoisyImapSender } from './imap'
import { classifyThread } from './ai'
import { upsertContact } from './contacts'
import type { ClassificationInput, AiClassificationOutput } from '@/types'
import crypto from 'crypto'

export async function runInitialScan(jobId: string, userId: string, emailAccountId: string, scanWindowDays: number = 30) {
  try {
    await prisma.scanJob.update({ where: { id: jobId }, data: { status: 'running' } })

    const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
    if (!account) throw new Error('Email account not found')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

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
      })
      return
    }

    // Gmail path
    const gmail = await getGmailClient(emailAccountId)
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
        })
        if (result) created++
        processed++

        if (processed % 10 === 0) {
          await prisma.scanJob.update({
            where: { id: jobId },
            data: { threadsProcessed: processed, actionItemsCreated: created },
          })
        }
        // Rate limiting
        await new Promise(r => setTimeout(r, 100))
      } catch {
        // Skip failed threads
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
      },
    })
  } catch (error) {
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
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
}) {
  const { jobId, userId, emailAccountId, userEmail, userTimezone, userPreferences, scanWindowDays } = params

  const accessToken = await getOutlookAccessToken(emailAccountId)
  const threads = await getOutlookThreads(accessToken, userEmail, scanWindowDays)

  await prisma.scanJob.update({
    where: { id: jobId },
    data: { threadsFound: threads.length },
  })

  let processed = 0
  let created = 0

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
      if (isNoisyOutlookMessage(senderEmail, [])) {
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

      // Build classification input
      const messageInputs = thread.messages.slice(-10).map(msg => {
        const fromEmail = msg.from?.emailAddress?.address ?? ''
        const toEmails = (msg.toRecipients || []).map(r => r.emailAddress?.address ?? '')
        const isFromUser = fromEmail.toLowerCase() === userEmail.toLowerCase()
        const bodyText = (msg.body?.content || msg.bodyPreview || '').substring(0, 1000)
        return {
          from: fromEmail,
          to: toEmails,
          sent_at: msg.receivedDateTime,
          is_from_user: isFromUser,
          body_excerpt: bodyText,
        }
      })

      const classificationInput: ClassificationInput = {
        user_email: userEmail,
        current_date: new Date().toISOString().split('T')[0],
        timezone: userTimezone,
        thread_subject: thread.subject,
        messages: messageInputs,
        user_preferences: userPreferences,
      }

      const inputHash = crypto.createHash('md5').update(JSON.stringify(classificationInput)).digest('hex')
      const result = await classifyThread(classificationInput)

      await prisma.aiClassificationLog.create({
        data: {
          userId,
          emailThreadId: upsertedThread.id,
          modelProvider: 'anthropic',
          modelName: 'claude-sonnet-4-6',
          inputHash,
          outputJson: result ? JSON.stringify(result) : null,
          confidenceScore: result?.confidence ?? null,
          errorMessage: result ? null : 'Classification failed',
        },
      })

      if (!result || !result.should_show_to_user || result.primary_category === 'no_action_needed') {
        processed++
        continue
      }

      // Create or update action item
      const existingAction = await prisma.actionItem.findFirst({
        where: { userId, emailThreadId: upsertedThread.id, status: { in: ['open', 'snoozed'] } },
      })

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
      }

      if (existingAction) {
        await prisma.actionItem.update({ where: { id: existingAction.id }, data: actionData })
      } else {
        await prisma.actionItem.create({
          data: {
            userId,
            emailThreadId: upsertedThread.id,
            source: 'outlook',
            status: 'open',
            ...actionData,
          },
        })
      }

      if (result.owner_email && result.owner_name) {
        await upsertContact(userId, result.owner_email, result.owner_name)
      }

      created++
      processed++

      if (processed % 10 === 0) {
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
}) {
  const { jobId, userId, emailAccountId, userEmail, userTimezone, userPreferences, scanWindowDays } = params

  const account = await prisma.emailAccount.findUnique({ where: { id: emailAccountId } })
  if (!account) throw new Error('Email account not found')

  const threads = await getImapThreads(emailAccountId, scanWindowDays)

  await prisma.scanJob.update({
    where: { id: jobId },
    data: { threadsFound: threads.length },
  })

  let processed = 0
  let created = 0

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

      // Build classification input
      const messageInputs = thread.messages.slice(-10).map(msg => ({
        from: msg.from,
        to: msg.to,
        sent_at: msg.date,
        is_from_user: msg.isFromUser,
        body_excerpt: msg.textBody,
      }))

      const classificationInput: ClassificationInput = {
        user_email: userEmail,
        current_date: new Date().toISOString().split('T')[0],
        timezone: userTimezone,
        thread_subject: thread.subject,
        messages: messageInputs,
        user_preferences: userPreferences,
      }

      const inputHash = crypto.createHash('md5').update(JSON.stringify(classificationInput)).digest('hex')
      const result = await classifyThread(classificationInput)

      await prisma.aiClassificationLog.create({
        data: {
          userId,
          emailThreadId: upsertedThread.id,
          modelProvider: 'anthropic',
          modelName: 'claude-sonnet-4-6',
          inputHash,
          outputJson: result ? JSON.stringify(result) : null,
          confidenceScore: result?.confidence ?? null,
          errorMessage: result ? null : 'Classification failed',
        },
      })

      if (!result || !result.should_show_to_user || result.primary_category === 'no_action_needed') {
        processed++
        continue
      }

      // Create or update action item
      const existingAction = await prisma.actionItem.findFirst({
        where: { userId, emailThreadId: upsertedThread.id, status: { in: ['open', 'snoozed'] } },
      })

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
      }

      if (existingAction) {
        await prisma.actionItem.update({ where: { id: existingAction.id }, data: actionData })
      } else {
        await prisma.actionItem.create({
          data: {
            userId,
            emailThreadId: upsertedThread.id,
            source: account.provider,
            status: 'open',
            ...actionData,
          },
        })
      }

      if (result.owner_email && result.owner_name) {
        await upsertContact(userId, result.owner_email, result.owner_name)
      }

      created++
      processed++

      if (processed % 10 === 0) {
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
}): Promise<boolean> {
  const { gmail, threadId, userId, emailAccountId, userEmail, userTimezone, userPreferences, provider = 'gmail' } = params

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

  if (isNoisyThread(labels, senderEmail)) return false

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

  const messageInputs = fullMessages.slice(-10).map(msg => {
    const msgHeaders = msg.payload?.headers || []
    const from = msgHeaders.find(h => h.name === 'From')?.value || ''
    const to = (msgHeaders.find(h => h.name === 'To')?.value || '').split(',')
    const sentAt = msgHeaders.find(h => h.name === 'Date')?.value || ''
    const fromEmail = from.replace(/.*<(.+)>/, '$1').trim()
    const fromName = from.includes('<') ? from.replace(/<.*>/, '').trim().replace(/^["']|["']$/g, '') : null
    const isFromUser = fromEmail.toLowerCase() === userEmail.toLowerCase()
    const body = getMessageBody(msg.payload as Parameters<typeof getMessageBody>[0])

    participants.add(from)
    lastMessageFromUser = isFromUser

    if (fromEmail && !isFromUser) {
      senderContactsToUpsert.push({ email: fromEmail, name: fromName || null })
    }

    return {
      from: fromEmail,
      to,
      sent_at: sentAt,
      is_from_user: isFromUser,
      body_excerpt: body.substring(0, 1000),
    }
  })

  const lastMsgDate = new Date(
    (fullMessages[fullMessages.length - 1].payload?.headers?.find(h => h.name === 'Date')?.value || Date.now())
  )

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

  const result = await classifyThread(classificationInput)

  await prisma.aiClassificationLog.create({
    data: {
      userId,
      emailThreadId: upsertedThread.id,
      modelProvider: 'anthropic',
      modelName: 'claude-sonnet-4-6',
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
  }

  if (existingAction) {
    await prisma.actionItem.update({ where: { id: existingAction.id }, data: actionData })
  } else {
    await prisma.actionItem.create({
      data: {
        userId,
        emailThreadId: upsertedThread.id,
        source: provider,
        status: 'open',
        ...actionData,
      },
    })
  }

  return true
}
