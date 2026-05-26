import { prisma } from './prisma'

export type PlanType = 'free' | 'lite' | 'pro'

export interface PlanInfo {
  type: PlanType
  isActive: boolean
  expiresAt: Date | null   // null = never expires (paid, managed externally)
  daysLeft: number | null  // null = infinite
}

export interface PlanLimits {
  emailAccounts: number     // -1 = unlimited
  aiCallsPerMonth: number   // -1 = unlimited; only enforced when using Pendingly's default API key
  scanWindowDays: number    // look-back for the initial full scan; subsequent syncs are incremental
  maxThreadsPerScan: number // hard cap on threads processed per scan run; -1 = unlimited
  followupSequenceSteps: number // 0 = disabled, -1 = unlimited
  canDisableSignature: boolean
  calendarAutoCreate: boolean
  zoomIntegration: boolean
  followupSequences: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    emailAccounts: 1,
    aiCallsPerMonth: 1000,
    scanWindowDays: 3,          // last 3 days (matches pricing page)
    maxThreadsPerScan: 50,      // conservative cap to stay within Vercel timeout
    followupSequenceSteps: 0,
    canDisableSignature: false,
    calendarAutoCreate: false,
    zoomIntegration: false,
    followupSequences: false,
  },
  lite: {
    emailAccounts: 3,
    aiCallsPerMonth: 5000,
    scanWindowDays: 7,          // last 7 days (matches pricing page)
    maxThreadsPerScan: 150,
    followupSequenceSteps: 3,
    canDisableSignature: true,
    calendarAutoCreate: true,
    zoomIntegration: true,
    followupSequences: true,
  },
  pro: {
    emailAccounts: -1,
    aiCallsPerMonth: -1,
    scanWindowDays: 30,         // full 30-day history (matches pricing page)
    maxThreadsPerScan: 300,
    followupSequenceSteps: -1,
    canDisableSignature: true,
    calendarAutoCreate: true,
    zoomIntegration: true,
    followupSequences: true,
  },
}

export const PLAN_PRICES: Record<Exclude<PlanType, 'free'>, number> = {
  lite: 9,
  pro: 15,
}

export const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free Trial',
  lite: 'Pendingly Lite',
  pro: 'Pendingly Pro',
}

export async function getUserPlan(userId: string): Promise<PlanInfo> {
  // PROMO_PLAN env override: while set, everyone is on this plan with no expiry.
  // Used during early access — set PROMO_PLAN=pro to give all users full access.
  const promo = process.env.PROMO_PLAN as PlanType | undefined
  if (promo && (promo === 'free' || promo === 'lite' || promo === 'pro')) {
    return { type: promo, isActive: true, expiresAt: null, daysLeft: null }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true, planExpiresAt: true, trialStartedAt: true },
  })
  if (!user) throw new Error('User not found')

  const type = (user.planType as PlanType) || 'free'
  const now = new Date()

  if (!user.planExpiresAt) {
    // No expiry set — treat as active indefinitely (paid plans managed externally)
    return { type, isActive: true, expiresAt: null, daysLeft: null }
  }

  const isActive = user.planExpiresAt > now
  const daysLeft = isActive
    ? Math.ceil((user.planExpiresAt.getTime() - now.getTime()) / 86_400_000)
    : 0

  return { type, isActive, expiresAt: user.planExpiresAt, daysLeft }
}

export function isByokAllowed(planType: PlanType): boolean {
  return planType !== 'free'
}

export interface AiUsage {
  used: number
  limit: number              // -1 = unlimited
  percent: number            // 0–100, clamped
  exceeded: boolean
  resetAt: Date              // first of next month
  planType: PlanType
}

/**
 * Returns the current calendar-month usage of Pendingly's default API key
 * for this user. BYOK calls are excluded — they're not metered.
 */
export async function getUserAiUsage(userId: string): Promise<AiUsage> {
  const plan = await getUserPlan(userId)
  const limit = PLAN_LIMITS[plan.type].aiCallsPerMonth

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const used = await prisma.aiClassificationLog.count({
    where: {
      userId,
      usedDefaultKey: true,
      createdAt: { gte: monthStart },
    },
  })

  const exceeded = limit !== -1 && used >= limit
  const percent = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))

  return { used, limit, percent, exceeded, resetAt, planType: plan.type }
}

/**
 * Should the user be allowed to make another AI call right now?
 * Returns true for BYOK users (their config.isDefaultKey === false) regardless
 * of quota, since they're paying their own provider.
 */
export async function canMakeAiCall(userId: string, isDefaultKey: boolean): Promise<{ ok: boolean; reason?: string; usage?: AiUsage }> {
  if (!isDefaultKey) return { ok: true }
  const usage = await getUserAiUsage(userId)
  if (usage.exceeded) {
    return {
      ok: false,
      reason: `Monthly AI quota reached (${usage.used}/${usage.limit}). Upgrade to a higher plan or add your own API key in Settings → AI Provider.`,
      usage,
    }
  }
  return { ok: true, usage }
}

export async function addPlanDays(userId: string, days: number): Promise<Date> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planExpiresAt: true, trialStartedAt: true },
  })
  if (!user) throw new Error('User not found')

  // Base: current expiry or trialStartedAt+90, whichever exists
  const base = user.planExpiresAt
    ?? new Date(user.trialStartedAt.getTime() + 90 * 86_400_000)

  // Extend from base or now — whichever is later (so bonuses always add real time)
  const from = base > new Date() ? base : new Date()
  const newExpiry = new Date(from.getTime() + days * 86_400_000)

  await prisma.user.update({ where: { id: userId }, data: { planExpiresAt: newExpiry } })
  return newExpiry
}

export const SIGNATURE_HTML = `<div style="margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;font-family:sans-serif">Sent via <a href="https://pendingly.app" style="color:#9ca3af;text-decoration:none">Pendingly</a> — smart email follow-up</div>`
