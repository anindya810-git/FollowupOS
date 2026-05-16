import { NextRequest } from 'next/server'

export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const bearer = request.headers.get('authorization')
  if (bearer === `Bearer ${secret}`) return true
  if (request.headers.get('x-cron-secret') === secret) return true
  return false
}
