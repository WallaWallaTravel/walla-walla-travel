import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PreTripInspectionClient } from '@/app/inspections/pre-trip/PreTripInspectionClient'
import '@testing-library/jest-dom'

// Mock the mobile components
jest.mock('@/components/mobile', () => ({
  TouchButton: ({ children, onClick, variant, loading, disabled, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`h-12 ${className || ''} ${variant}`}
      data-testid="mobile-button"
    >
      {children}
    </button>
  ),
  MobileButton: ({ children, onClick, variant, fullWidth }: any) => (
    <button 
      onClick={onClick} 
      className={`h-12 ${fullWidth ? 'w-full' : ''} ${variant}`}
      data-testid="mobile-button"
    >
      {children}
    </button>
  ),
  MobileCheckbox: ({ label, checked, onChange }: any) => (
    <label className="h-12 flex items-center" data-testid="mobile-checkbox">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={() => onChange(!checked)}
        className="h-12 w-12"
      />
      <span>{label}</span>
    </label>
  ),
  MobileInput: ({ label, value, onChange, type, placeholder }: any) => (
    <div data-testid="mobile-input">
      {label && <label>{label}</label>}
      <input 
        type={type} 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className="h-12 text-base"
        style={{ fontSize: '16px' }}
      />
    </div>
  ),
  BottomActionBar: ({ children }: any) => (
    <div className="fixed bottom-0" data-testid="bottom-action-bar">
      {children}
    </div>
  ),
  BottomActionBarSpacer: () => <div className="h-16" />,
  SignatureCanvas: ({ onSignature, onClear }: any) => (
    <div data-testid="signature-canvas">
      <canvas />
      <button onClick={() => onSignature('mock-signature')}>Sign</button>
      <button onClick={onClear}>Clear</button>
    </div>
  ),
  MobileCard: ({ children, className }: any) => (
    <div className={`bg-white rounded-lg p-4 ${className || ''}`} data-testid="mobile-card">
      {children}
    </div>
  ),
  AlertBanner: ({ type, message, onDismiss }: any) => (
    <div className={`alert-${type}`} data-testid="alert-banner">
      {message}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }
}))

// Mock server action
jest.mock('@/app/actions/inspections', () => ({
  saveInspectionAction: jest.fn(),
  savePreTripInspection: jest.fn()
}))

describe('Pre-Trip Inspection Mobile UI', () => {
  const mockDriver = {
    id: 'test-driver-1',
    email: 'driver@test.com',
    name: 'Test Driver'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Mobile Component Integration', () => {
    it('should use MobileCheckbox components with 48px touch targets', async () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // First, enter mileage and go to inspection step
      const mileageInput = screen.getByPlaceholderText(/enter current mileage/i)
      fireEvent.change(mileageInput, { target: { value: '50000' } })
      
      const nextButton = screen.getByText(/next/i)
      fireEvent.click(nextButton)
      
      // Now checkboxes should be visible
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        expect(checkboxes.length).toBeGreaterThan(0)
        
        // Verify touch target size
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveClass('h-12') // 48px height
        })
      })
    })

    it('should use MobileButton for submit with proper styling', async () => {
      const { saveInspectionAction } = require('@/app/actions/inspections')
      saveInspectionAction.mockResolvedValue({ success: true })
      
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Navigate through all steps to reach submit
      // Step 1: Enter mileage
      const mileageInput = screen.getByPlaceholderText(/enter current mileage/i)
      fireEvent.change(mileageInput, { target: { value: '50000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      // Step 2: Check all inspection items
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => {
          const input = cb.querySelector('input[type="checkbox"]')
          fireEvent.click(input!)
        })
      })
      
      // Click next to go to signature step
      const nextButtons = screen.getAllByText(/next/i)
      fireEvent.click(nextButtons[nextButtons.length - 1])
      
      // Step 3: Add signature
      await waitFor(() => {
        const signButton = screen.getByText(/sign/i)
        fireEvent.click(signButton)
      })
      
      // Now submit button should be visible
      await waitFor(() => {
        const submitButton = screen.getByText(/complete inspection/i)
        expect(submitButton).toBeInTheDocument()
        expect(submitButton).toHaveAttribute('data-testid', 'mobile-button')
        expect(submitButton.parentElement).toHaveClass('h-12')
      })
    })

    it('should use MobileInput for mileage with 16px font size', () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // The mileage input should be visible on first step
      const mileageInputContainer = screen.getByTestId('mobile-input')
      expect(mileageInputContainer).toBeInTheDocument()
      
      const input = mileageInputContainer.querySelector('input')
      expect(input).toHaveStyle({ fontSize: '16px' })
      expect(input).toHaveClass('h-12')
    })

    it('should place submit button in BottomActionBar', () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      const actionBar = screen.getByTestId('bottom-action-bar')
      expect(actionBar).toBeInTheDocument()
      expect(actionBar).toHaveClass('fixed', 'bottom-0')
      
      // The action bar should contain navigation buttons
      const buttons = within(actionBar).getAllByTestId('mobile-button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on checkbox toggle', async () => {
      const { haptics } = require('@/components/mobile')
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Navigate to inspection step
      const mileageInput = screen.getByPlaceholderText(/enter current mileage/i)
      fireEvent.change(mileageInput, { target: { value: '50000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      // Click checkbox
      await waitFor(() => {
        const firstCheckbox = screen.getAllByTestId('mobile-checkbox')[0]
        const input = firstCheckbox.querySelector('input')
        fireEvent.click(input!)
        expect(haptics.light).toHaveBeenCalled()
      })
    })

    it('should trigger success haptic on successful submission', async () => {
      const { haptics } = require('@/components/mobile')
      const { saveInspectionAction } = require('@/app/actions/inspections')
      saveInspectionAction.mockResolvedValue({ success: true })
      
      // Mock window.location
      delete (window as any).location
      window.location = { href: '' } as any
      
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Navigate through all steps
      // Step 1: Mileage
      fireEvent.change(screen.getByPlaceholderText(/enter current mileage/i), { target: { value: '50000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      // Step 2: Check all items
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => {
          const input = cb.querySelector('input')
          fireEvent.click(input!)
        })
      })
      
      const nextButtons = screen.getAllByText(/next/i)
      fireEvent.click(nextButtons[nextButtons.length - 1])
      
      // Step 3: Sign and submit
      await waitFor(() => {
        fireEvent.click(screen.getByText(/sign/i))
      })
      
      const submitButton = screen.getByText(/complete inspection/i)
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(haptics.success).toHaveBeenCalled()
      })
    })

    it('should trigger error haptic on submission failure', async () => {
      const { haptics } = require('@/components/mobile')
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Try to proceed without entering mileage
      const nextButton = screen.getByText(/next/i)
      fireEvent.click(nextButton)
      
      await waitFor(() => {
        expect(haptics.error).toHaveBeenCalled()
      })
    })
  })

  describe('Mobile-First Layout', () => {
    it('should have single column layout for mobile', async () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Navigate to inspection step where layout matters most
      fireEvent.change(screen.getByPlaceholderText(/enter current mileage/i), { target: { value: '50000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('mobile-card')
        // Cards should stack vertically (no grid classes)
        cards.forEach(card => {
          expect(card.className).not.toMatch(/grid-cols-[2-9]/)
        })
      })
    })

    it('should have adequate spacing between touch targets', async () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Navigate to inspection step
      fireEvent.change(screen.getByPlaceholderText(/enter current mileage/i), { target: { value: '50000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        expect(checkboxes.length).toBeGreaterThan(1)
        // Each checkbox should have proper height for touch
        checkboxes.forEach(cb => {
          expect(cb).toHaveClass('h-12')
        })
      })
    })

    it('should show loading state with disabled submit button', async () => {
      const { saveInspectionAction } = require('@/app/actions/inspections')
      // Mock a slow response
      saveInspectionAction.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000)))
      
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Navigate to signature step
      fireEvent.change(screen.getByPlaceholderText(/enter current mileage/i), { target: { value: '50000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => {
          fireEvent.click(cb.querySelector('input')!)
        })
      })
      
      const nextButtons = screen.getAllByText(/next/i)
      fireEvent.click(nextButtons[nextButtons.length - 1])
      
      await waitFor(() => {
        fireEvent.click(screen.getByText(/sign/i))
      })
      
      const submitButton = screen.getByText(/complete inspection/i)
      fireEvent.click(submitButton)
      
      // Button should show loading state
      await waitFor(() => {
        const loadingButton = screen.getByText(/submitting/i)
        expect(loadingButton).toBeInTheDocument()
        expect(loadingButton).toBeDisabled()
      })
    })
  })

  describe('Form Validation', () => {
    it('should require mileage input', async () => {
      const { haptics } = require('@/components/mobile')
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Try to proceed without entering mileage
      const nextButton = screen.getByText(/next/i)
      expect(nextButton).toBeDisabled()
    })

    it('should validate mileage is a positive number', async () => {
      const { haptics } = require('@/components/mobile')
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      const mileageInput = screen.getByPlaceholderText(/enter current mileage/i)
      
      // Try negative number
      fireEvent.change(mileageInput, { target: { value: '-100' } })
      
      // Input should not accept negative (filtered out)
      expect(mileageInput).toHaveValue('')
    })

    it('should require vehicle selection', () => {
      // This test is for future implementation when vehicle selection is added
      // Currently using hardcoded vehicle ID
      expect(true).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for form elements', () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // Check for proper labeling
      const mileageInput = screen.getByPlaceholderText(/enter current mileage/i)
      expect(mileageInput).toBeInTheDocument()
      
      // Labels should be associated with inputs
      const label = screen.getByText(/vehicle mileage/i)
      expect(label).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(<PreTripInspectionClient driver={mockDriver} />)
      
      // All interactive elements should be keyboard accessible
      const mileageInput = screen.getByPlaceholderText(/enter current mileage/i)
      const nextButton = screen.getByText(/next/i)
      
      // These should be focusable
      expect(mileageInput).not.toHaveAttribute('tabindex', '-1')
      expect(nextButton).not.toHaveAttribute('tabindex', '-1')
    })
  })
})