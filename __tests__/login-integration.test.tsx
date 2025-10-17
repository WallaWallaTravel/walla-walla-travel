/**
 * Integration test for login functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { loginAction } from '@/app/actions/auth';

// Mock the login action
jest.mock('@/app/actions/auth', () => ({
  loginAction: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Login Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form with driver credentials', () => {
    render(<LoginPage />);
    
    // Check form elements
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Check credentials are displayed
    expect(screen.getByText(/eric@wallawallatravel.com/i)).toBeInTheDocument();
    expect(screen.getByText(/travel2024/i)).toBeInTheDocument();
  });

  it('should have correct default email', () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe('eric@wallawallatravel.com');
  });

  it('should handle successful login', async () => {
    (loginAction as jest.Mock).mockResolvedValue({ success: true });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Fill in form
    fireEvent.change(emailInput, { target: { value: 'eric@wallawallatravel.com' } });
    fireEvent.change(passwordInput, { target: { value: 'travel2024' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    
    // Wait for login to complete
    await waitFor(() => {
      expect(loginAction).toHaveBeenCalledWith('eric@wallawallatravel.com', 'travel2024');
    });
  });

  it('should display error message on failed login', async () => {
    (loginAction as jest.Mock).mockResolvedValue({ 
      error: 'Invalid email or password' 
    });
    
    render(<LoginPage />);
    
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Fill in wrong password
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
    
    // Button should be enabled again
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle network errors gracefully', async () => {
    (loginAction as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<LoginPage />);
    
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(passwordInput, { target: { value: 'travel2024' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  it('should require email and password', () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    
    // Check required attributes
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
    
    // Check input types
    expect(emailInput.type).toBe('email');
    expect(passwordInput.type).toBe('password');
  });
});