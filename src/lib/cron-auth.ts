import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const bearer = request.headers.get('authorization')
  if (bearer && bearer.startsWith('Bearer ') && safeEqual(bearer.slice(7), secret)) return true
  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret && safeEqual(headerSecret, secret)) return true
  return false
}
