import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPlan, PLAN_LIMITS } from '@/lib/plan'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(session.user.id)
  const limits = PLAN_LIMITS[plan.type]
  return NextResponse.json({
    ...plan,
    // Expose the key scan limits so the UI can display them without duplicating the constants
    scanWindowDays: limits.scanWindowDays,
    maxThreadsPerScan: limits.maxThreadsPerScan,
  })
}
