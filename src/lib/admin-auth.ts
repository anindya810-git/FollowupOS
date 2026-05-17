import { scryptSync, timingSafeEqual, randomBytes } from 'crypto'
import { encrypt, decrypt } from './crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const COOKIE_NAME = 'admin_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? 'anindya810@gmail.com'
}

function getAdminPasswordHash(): string | null {
  return process.env.ADMIN_PASSWORD_HASH ?? null
}

// Hash a password for storage in ADMIN_PASSWORD_HASH env var.
// Usage (one-time, in Node REPL): require('./src/lib/admin-auth').hashAdminPassword('yourpassword')
export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyAdminPassword(password: string): boolean {
  const stored = getAdminPasswordHash()
  if (!stored) {
    // Fallback: allow ADMIN_PASSWORD plaintext env var for quick dev setup
    const plain = process.env.ADMIN_PASSWORD
    if (plain) return password === plain
    return false
  }
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  try {
    const attempt = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    if (attempt.length !== expected.length) return false
    return timingSafeEqual(attempt, expected)
  } catch {
    return false
  }
}

interface AdminSession {
  email: string
  exp: number
}

export function createAdminSessionCookie(): string {
  const payload: AdminSession = {
    email: getAdminEmail(),
    exp: Date.now() + SESSION_TTL_MS,
  }
  return encrypt(JSON.stringify(payload))
}

export function parseAdminSession(token: string): AdminSession | null {
  try {
    const data = JSON.parse(decrypt(token)) as AdminSession
    if (data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

// Server component helper (uses next/headers cookies)
export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  return parseAdminSession(token)
}

// Route handler helper (uses NextRequest)
export function getAdminSessionFromRequest(req: NextRequest): AdminSession | null {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return parseAdminSession(token)
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME }
