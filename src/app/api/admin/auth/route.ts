import { NextRequest, NextResponse } from 'next/server'
import {
  getAdminEmail,
  verifyAdminPassword,
  createAdminSessionCookie,
  getAdminSessionFromRequest,
  ADMIN_COOKIE_NAME,
} from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  if (email.toLowerCase() !== getAdminEmail().toLowerCase()) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = createAdminSessionCookie()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  })
  return response
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return response
}

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return NextResponse.json({ authenticated: false })
  return NextResponse.json({ authenticated: true, email: session.email })
}
