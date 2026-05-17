import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_PREFIX = 'pndly_oauth_state_'
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function secretKey(): string {
  const k = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!k) throw new Error('Missing ENCRYPTION_KEY / NEXTAUTH_SECRET for OAuth state signing')
  return k
}

function sign(state: string, userId: string): string {
  return createHmac('sha256', secretKey()).update(`${state}|${userId}`).digest('hex')
}

/**
 * Mint a CSRF state token for an OAuth flow. Stores a signed token in an
 * HttpOnly cookie scoped to the user, and returns the raw state string to
 * include in the OAuth `state` parameter. Verify with `verifyOAuthState`
 * in the callback.
 */
export async function issueOAuthState(provider: string, userId: string): Promise<string> {
  const state = randomBytes(32).toString('hex')
  const signed = sign(state, userId)
  const cookieStore = await cookies()
  cookieStore.set(`${COOKIE_PREFIX}${provider}`, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_MS / 1000,
  })
  return state
}

/**
 * Verify a state parameter from an OAuth callback against the cookie.
 * Returns true only on exact, timing-safe match for the given user.
 * Always clears the cookie afterwards so a stale state can't be replayed.
 */
export async function verifyOAuthState(
  provider: string,
  userId: string,
  stateParam: string | null | undefined,
): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieName = `${COOKIE_PREFIX}${provider}`
  const cookie = cookieStore.get(cookieName)?.value
  cookieStore.delete(cookieName)
  if (!cookie || !stateParam) return false
  const expected = sign(stateParam, userId)
  if (cookie.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(cookie), Buffer.from(expected))
  } catch {
    return false
  }
}
