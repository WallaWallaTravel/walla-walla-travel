import { requireAuth, getServerSession, getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('next/navigation')
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({})),
}))

describe('Authentication Security', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should redirect to login when no session exists', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      }
      ;(createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase)

      await requireAuth()

      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('should return session when authenticated', async () => {
      const mockSession = { user: { email: 'test@example.com' } }
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession } }),
        },
      }
      ;(createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase)

      const result = await requireAuth()

      expect(result).toEqual(mockSession)
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('getUser', () => {
    it('should return null when no session exists', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      }
      ;(createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase)

      const result = await getUser()

      expect(result).toBeNull()
    })

    it('should fetch driver data when session exists', async () => {
      const mockSession = { user: { email: 'test@example.com' } }
      const mockDriver = { id: '123', email: 'test@example.com', name: 'Test Driver' }
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession } }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockDriver }),
            }),
          }),
        }),
      }
      ;(createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase)

      const result = await getUser()

      expect(result).toEqual(mockDriver)
      expect(mockSupabase.from).toHaveBeenCalledWith('drivers')
    })
  })

  describe('Session Security', () => {
    it('should use server-side session management only', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      }
      ;(createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase)

      await getServerSession()

      // Verify that we're using server-side auth helpers, not client-side
      expect(createServerComponentClient).toHaveBeenCalled()
      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
    })
  })
})