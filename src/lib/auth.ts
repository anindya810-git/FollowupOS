import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

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
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
})
