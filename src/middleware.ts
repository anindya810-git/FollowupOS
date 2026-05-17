import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Server-side auth gate so dashboard routes never flash a logged-out shell
// before redirecting. NextAuth's session cookie name varies in dev vs prod;
// we just check both. Real session validation still happens via auth() in
// the route / page itself — this middleware only stops the client-side
// flicker on unauthenticated visits.
const SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/queue',
  '/analytics',
  '/settings',
  '/help',
  '/scan',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!isProtected) return NextResponse.next()

  const hasSession = SESSION_COOKIES.some(name => request.cookies.has(name))
  if (hasSession) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // Skip Next internals and API routes (those handle auth themselves)
  matcher: ['/((?!api|_next|favicon.ico|icons|sw.js|manifest.json).*)'],
}
