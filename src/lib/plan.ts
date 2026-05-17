import { prisma } from './prisma'

export type PlanType = 'free' | 'lite' | 'pro'

export interface PlanInfo {
  type: PlanType
  isActive: boolean
  expiresAt: Date | null   // null = never expires (paid, managed externally)
  daysLeft: number | null  // null = infinite
}

export interface PlanLimits {
  emailAccounts: number   // -1 = unlimited
  aiCallsPerMonth: number // -1 = unlimited
  followupSequenceSteps: number // 0 = disabled, -1 = unlimited
  canDisableSignature: boolean
  calendarAutoCreate: boolean
  zoomIntegration: boolean
  followupSequences: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    emailAccounts: 1,
    aiCallsPerMonth: 100,
    followupSequenceSteps: 0,
    canDisableSignature: false,
    calendarAutoCreate: false,
    zoomIntegration: false,
    followupSequences: false,
  },
  lite: {
    emailAccounts: 3,
    aiCallsPerMonth: 500,
    followupSequenceSteps: 3,
    canDisableSignature: true,
    calendarAutoCreate: true,
    zoomIntegration: true,
    followupSequences: true,
  },
  pro: {
    emailAccounts: -1,
    aiCallsPerMonth: -1,
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
