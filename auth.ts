/**
 * Auth.js v5 — Main configuration
 *
 * Credentials provider verifies against existing users table (bcrypt).
 * JWT strategy with role and userId in token/session.
 *
 * NOTE: PrismaAdapter is NOT used yet — it requires Auth.js-specific tables
 * (Account, Session, VerificationToken) that don't exist in our schema.
 * It will be added when we introduce OAuth or magic link providers,
 * after creating the required tables via migration.
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

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        // Query existing users table via Prisma
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

        // Update last_login timestamp
        await prisma.users.update({
          where: { id: user.id },
          data: { last_login: new Date() },
        }).catch(() => {}) // Non-blocking

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
