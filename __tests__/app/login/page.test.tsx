import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('Login Page', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      auth: {
        signInWithPassword: jest.fn(),
      },
    }
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    mockPush.mockClear()
  })

  it('should render login form', () => {
    render(<LoginPage />)
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('PIN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })

  it('should validate PIN format', async () => {
    render(<LoginPage />)
    
    const form = screen.getByRole('form', { hidden: true }) || screen.getByLabelText('Email').closest('form')
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(pinInput, { target: { value: '123' } }) // Too short
    
    // Submit the form directly to bypass HTML5 validation
    fireEvent.submit(form!)

    await waitFor(() => {
      expect(screen.getByText('PIN must be 4 digits')).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { id: '123', email: 'test@example.com', name: 'Test Driver' },
      error: null,
    })
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    })

    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should handle login failure', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: 'Invalid credentials',
    })

    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(pinInput, { target: { value: '9999' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email or PIN')).toBeInTheDocument()
    })
  })

  it('should prevent SQL injection attempts', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: "admin'; DROP TABLE users;--" } })
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', "admin'; drop table users;--")
      expect(mockSupabase.eq).toHaveBeenCalledWith('pin', '1234')
    })
  })

  it('should only accept numeric PIN input', () => {
    render(<LoginPage />)
    
    const pinInput = screen.getByLabelText('PIN') as HTMLInputElement

    fireEvent.change(pinInput, { target: { value: 'abc123' } })
    expect(pinInput.value).toBe('123') // Non-numeric characters should be stripped
  })
})