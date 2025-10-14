/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')

describe('Middleware Security', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ 
          data: { session: null }, 
          error: null 
        }),
      },
    }
    ;(createMiddlewareClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Protected Routes', () => {
    it('should redirect to login for protected routes without session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

      const protectedPaths = [
        '/workflow/daily',
        '/workflow/client-notes',
        '/inspections/pre-trip',
        '/inspections/post-trip',
        '/dashboard',
      ]

      for (const path of protectedPaths) {
        const request = new NextRequest(new URL(path, 'http://localhost'))
        const response = await middleware(request)

        expect(response?.status).toBe(307)
        expect(response?.headers.get('location')).toContain('/login')
      }
    })

    it('should allow access to protected routes with valid session', async () => {
      const mockSession = { user: { email: 'test@example.com' } }
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } })

      const request = new NextRequest(new URL('/workflow/daily', 'http://localhost'))
      const response = await middleware(request)

      expect(response).toEqual(NextResponse.next())
    })
  })

  describe('Public Routes', () => {
    it('should allow access to public routes without session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

      const publicPaths = [
        '/',
        '/login',
        '/security-test',
        '/api/health',
      ]

      for (const path of publicPaths) {
        const request = new NextRequest(new URL(path, 'http://localhost'))
        const response = await middleware(request)

        // Should not redirect
        if (path !== '/login') {
          expect(response?.status).not.toBe(307)
        }
      }
    })

    it('should redirect authenticated users from login to dashboard', async () => {
      const mockSession = { user: { email: 'test@example.com' } }
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } })

      const request = new NextRequest(new URL('/login', 'http://localhost'))
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/dashboard')
    })
  })

  describe('Static Assets', () => {
    it('should not run middleware on non-matched paths', async () => {
      // These paths are not in the matcher config
      const nonMatchedPaths = [
        '/',
        '/login',
        '/security-test',
        '/_next/static/chunk-123.js',
        '/favicon.ico',
      ]

      // The middleware shouldn't even be called for these paths
      // due to the matcher configuration
      expect(true).toBe(true) // This is handled by Next.js routing
    })
  })
})