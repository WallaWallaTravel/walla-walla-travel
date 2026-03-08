/**
 * Auth.js v5 — Main configuration
 *
 * Credentials provider verifies against existing users table (bcrypt).
 * JWT strategy with role and userId in token/session.
 *
 * RESILIENCE: If AUTH_SECRET is missing or invalid, exports safe stubs
 * so the 50+ files importing auth() don't crash. The old JWT system
 * (middleware.ts + lib/auth/session.ts) remains the primary auth gate.
 *
 * COEXISTENCE: This runs alongside the existing JWT auth system.
 * Both systems are valid during migration. The old system will be
 * removed once all routes are migrated.
 */

import type { NextRequest } from 'next/server'

// Only initialize NextAuth if AUTH_SECRET is available
let _handlers: { GET: (req: NextRequest) => Promise<Response>; POST: (req: NextRequest) => Promise<Response> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: (() => Promise<any>)
let _signIn: typeof Function.prototype
let _signOut: typeof Function.prototype

if (process.env.AUTH_SECRET) {
  try {
    // Dynamic require to avoid module-level crash when AUTH_SECRET is missing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NextAuth = require('next-auth').default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Credentials = require('next-auth/providers/credentials').default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prisma } = require('@/lib/prisma')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authConfig = require('./auth.config').default

    const result = NextAuth({
      ...authConfig,
      session: { strategy: 'jwt' },
      providers: [
        Credentials({
          name: 'credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials: Record<string, unknown>) {
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
        async jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string; role?: string } }) {
          if (user) {
            token.role = user.role
            token.userId = user.id
          }
          return token
        },
        async session({ session, token }: { session: { user?: { role?: string; id?: string } }; token: Record<string, unknown> }) {
          if (session.user) {
            session.user.role = token.role as string
            session.user.id = token.userId as string
          }
          return session
        },
      },
    })

    _handlers = result.handlers
    _auth = result.auth
    _signIn = result.signIn
    _signOut = result.signOut
  } catch (e) {
    console.error('[auth] NextAuth initialization failed:', e instanceof Error ? e.message : e)
    // Fall through to stubs below
  }
}

// Safe stubs if NextAuth is not initialized
if (!_auth!) {
  const stubResponse = () => new Response(JSON.stringify({ error: 'Auth not configured' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })

  _handlers = {
    GET: async () => stubResponse(),
    POST: async () => stubResponse(),
  }
  _auth = async () => null
  _signIn = async () => { throw new Error('Auth.js not configured — AUTH_SECRET missing') }
  _signOut = async () => { throw new Error('Auth.js not configured — AUTH_SECRET missing') }
}

export const handlers = _handlers!
export const auth = _auth!
export const signIn = _signIn!
export const signOut = _signOut!
