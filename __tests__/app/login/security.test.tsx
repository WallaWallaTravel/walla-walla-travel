import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('Login Page Security', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        signInWithPassword: jest.fn(),
      },
    }
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    mockPush.mockClear()
  })

  it('should have proper form accessibility', () => {
    render(<LoginPage />)
    
    // Check that labels are properly associated with inputs
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')
    
    expect(emailInput).toHaveAttribute('id', 'email')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    
    expect(pinInput).toHaveAttribute('id', 'pin')
    expect(pinInput).toHaveAttribute('type', 'password')
    expect(pinInput).toHaveAttribute('required')
  })

  it('should use parameterized queries for database operations', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: 'Invalid credentials',
    })

    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')
    const form = emailInput.closest('form')!

    // Try SQL injection
    fireEvent.change(emailInput, { target: { value: "test@example.com'; DROP TABLE drivers;--" } })
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.submit(form)

    await waitFor(() => {
      // Verify the Supabase client is using parameterized queries
      expect(mockSupabase.from).toHaveBeenCalledWith('drivers')
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', "test@example.com'; drop table drivers;--") // lowercase
      expect(mockSupabase.eq).toHaveBeenCalledWith('pin', '1234')
    })
  })

  it('should sanitize PIN input to only allow numbers', () => {
    render(<LoginPage />)
    
    const pinInput = screen.getByLabelText('PIN') as HTMLInputElement

    // Try to input non-numeric characters
    fireEvent.change(pinInput, { target: { value: 'abc123def456' } })
    
    // Should strip non-numeric characters
    expect(pinInput.value).toBe('1234') // First 4 digits only
  })

  it('should show loading state during authentication', async () => {
    mockSupabase.single.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'Test' }), 100))
    )

    render(<LoginPage />)
    
    const form = screen.getByLabelText('Email').closest('form')!
    const submitButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } })
    fireEvent.submit(form)

    // Should show loading state
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Logging in...')).toBeInTheDocument()

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('should handle authentication errors gracefully', async () => {
    mockSupabase.single.mockRejectedValue(new Error('Network error'))

    render(<LoginPage />)
    
    const form = screen.getByLabelText('Email').closest('form')!

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument()
    })
  })
})