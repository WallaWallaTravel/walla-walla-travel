/**
 * Auth.js v5 Edge-compatible configuration
 *
 * This file is imported by middleware.ts and must NOT import Prisma
 * (Prisma uses Node.js APIs unavailable in Edge runtime).
 *
 * Route protection and pages configuration live here.
 */

import type { NextAuthConfig } from 'next-auth'

export default {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // Protected route prefixes
      const protectedRoutes = [
        '/admin',
        '/driver-portal',
        '/workflow',
        '/inspections',
        '/time-clock',
        '/partner-portal',
        '/organizer-portal',
      ]

      const isProtected = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
      )

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl.origin)
        loginUrl.searchParams.set('redirect', pathname)
        return Response.redirect(loginUrl)
      }

      // Role-based route protection
      if (isLoggedIn && auth?.user) {
        const role = (auth.user as { role?: string }).role

        // Admin routes
        if (pathname.startsWith('/admin')) {
          if (role === 'admin') {
            // Full access
          } else if (role === 'geology_admin') {
            if (!pathname.startsWith('/admin/geology')) {
              return Response.redirect(new URL('/admin/geology', nextUrl.origin))
            }
          } else {
            return Response.redirect(new URL('/login?error=forbidden', nextUrl.origin))
          }
        }

        // Driver routes
        const driverRoutes = ['/driver-portal', '/workflow', '/inspections', '/time-clock']
        if (driverRoutes.some((r) => pathname.startsWith(r))) {
          if (role !== 'driver' && role !== 'admin') {
            return Response.redirect(new URL('/login?error=forbidden', nextUrl.origin))
          }
        }

        // Partner routes
        if (pathname.startsWith('/partner-portal')) {
          if (role !== 'partner' && role !== 'admin') {
            return Response.redirect(new URL('/login?error=forbidden', nextUrl.origin))
          }
        }

        // Organizer routes
        if (pathname.startsWith('/organizer-portal')) {
          if (role !== 'organizer' && role !== 'admin') {
            return Response.redirect(new URL('/login?error=forbidden', nextUrl.origin))
          }
        }
      }

      return true
    },
  },
  providers: [], // Providers configured in auth.ts (not edge-compatible)
} satisfies NextAuthConfig
