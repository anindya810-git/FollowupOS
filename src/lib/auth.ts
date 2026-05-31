import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { safeLog } from './safe-log'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Explicit secret so NextAuth doesn't silently fall back to a generated dev
  // value in production. AUTH_SECRET is NextAuth v5's preferred name;
  // NEXTAUTH_SECRET kept for backwards compatibility.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  // Required behind Vercel's proxy so callback URLs use the public host
  // header instead of the internal Vercel hostname.
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: {
    strategy: 'database',
    // Corporate-friendly session lifetime: expire after 7 days, refreshed
    // at most once a day (default 30 days is too long for shared/managed devices).
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Set the free trial expiry to 90 days from now.
      // Wrapped in try/catch so a transient DB error on cold start never
      // prevents the sign-in from completing — the plan can be initialised
      // on the next request if this fails.
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { planExpiresAt: new Date(Date.now() + 90 * 86_400_000) },
        })
      } catch (e) {
        safeLog('warn', 'createUser-plan-init-failed', e)
      }
    },
  },
  pages: {
    signIn: '/signup',
    // Send auth errors back to the sign-in page (with ?error=...) instead of
    // the landing page, so users see actionable feedback and a retry button.
    error: '/signup',
  },
})
