/**
 * Auth.js v5 — Main configuration
 *
 * Credentials provider verifies against existing users table (bcrypt).
 * JWT strategy with role and userId in token/session.
 *
 * RESILIENCE: If AUTH_SECRET is missing, auth() returns null and handlers
 * return 503. The old JWT system handles auth via middleware regardless.
 *
 * COEXISTENCE: This runs alongside the existing JWT auth system.
 * Both systems are valid during migration. The old system will be
 * removed once all routes are migrated.
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import authConfig from './auth.config'

// If AUTH_SECRET is missing, export safe stubs so 50+ importing files don't crash
if (!process.env.AUTH_SECRET) {
  console.warn('[auth] AUTH_SECRET not set — Auth.js disabled, old JWT system is primary')
}

const hasSecret = !!process.env.AUTH_SECRET

const nextAuthResult = hasSecret
  ? NextAuth({
      ...authConfig,
      session: { strategy: 'jwt' },
      providers: [
        Credentials({
          name: 'credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
              return null
            }

            const email = credentials.email as string
            const password = credentials.password as string

            const user = await prisma.users.findFirst({
              where: {
                email: email.toLowerCase().trim(),
                is_active: true,
              },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                password_hash: true,
              },
            })

            if (!user || !user.password_hash) {
              return null
            }

            const isValid = await bcrypt.compare(password, user.password_hash)
            if (!isValid) {
              return null
            }

            await prisma.users.update({
              where: { id: user.id },
              data: { last_login: new Date() },
            }).catch(() => {})

            return {
              id: String(user.id),
              email: user.email,
              name: user.name,
              role: user.role,
            }
          },
        }),
      ],
      callbacks: {
        async jwt({ token, user }) {
          if (user) {
            token.role = (user as { role?: string }).role
            token.userId = user.id
          }
          return token
        },
        async session({ session, token }) {
          if (session.user) {
            session.user.role = token.role as string
            session.user.id = token.userId as string
          }
          return session
        },
      },
    })
  : null

// Stub handlers for when Auth.js is not configured
const stubResponse = () =>
  new Response(JSON.stringify({ error: 'Auth not configured' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })

export const handlers = nextAuthResult?.handlers ?? {
  GET: async () => stubResponse(),
  POST: async () => stubResponse(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: () => Promise<any> = nextAuthResult?.auth ?? (async () => null)

export const signIn = nextAuthResult?.signIn ?? (async () => {
  throw new Error('Auth.js not configured — AUTH_SECRET missing')
})

export const signOut = nextAuthResult?.signOut ?? (async () => {
  throw new Error('Auth.js not configured — AUTH_SECRET missing')
})
