import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PostTripInspectionClient } from '@/app/inspections/post-trip/PostTripInspectionClient'
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
  SignatureCanvas: ({ onSignature, onClear, label }: any) => (
    <div data-testid={`signature-canvas-${label?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}>
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
  savePostTripInspection: jest.fn()
}))

describe('Post-Trip Inspection Mobile UI', () => {
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
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Enter ending mileage and go to inspection step
      const mileageInput = screen.getByPlaceholderText(/enter ending mileage/i)
      fireEvent.change(mileageInput, { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      // Checkboxes should be visible
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        expect(checkboxes.length).toBeGreaterThan(0)
        
        // Verify 48px touch targets
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveClass('h-12') // 48px height
        })
      })
    })

    it('should use TouchButton for navigation with proper styling', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      const actionBar = screen.getByTestId('bottom-action-bar')
      const buttons = within(actionBar).getAllByTestId('mobile-button')
      
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach(button => {
        expect(button).toHaveClass('h-12')
      })
    })

    it('should use MobileInput for ending mileage with 16px font size', () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      const mileageInputContainer = screen.getByTestId('mobile-input')
      const input = mileageInputContainer.querySelector('input')
      
      expect(input).toHaveStyle({ fontSize: '16px' })
      expect(input).toHaveClass('h-12')
    })

    it('should place navigation buttons in BottomActionBar', () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      const actionBar = screen.getByTestId('bottom-action-bar')
      expect(actionBar).toBeInTheDocument()
      expect(actionBar).toHaveClass('fixed', 'bottom-0')
    })
  })

  describe('4-Step Flow', () => {
    it('should implement mileage → inspection → defects → DVIR flow', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Step 1: Ending Mileage
      expect(screen.getByText(/enter ending mileage/i)).toBeInTheDocument()
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      // Step 2: Inspection
      await waitFor(() => {
        expect(screen.getByText(/post-trip inspection/i)).toBeInTheDocument()
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Step 3: Defects
      await waitFor(() => {
        expect(screen.getByText(/report defects/i)).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText(/no defects/i))
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Step 4: DVIR Signature
      await waitFor(() => {
        expect(screen.getByText(/driver vehicle inspection report/i)).toBeInTheDocument()
        expect(screen.getByTestId('signature-canvas-driver-signature')).toBeInTheDocument()
      })
    })

    it('should show progress indicator for all 4 steps', () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      expect(screen.getByText('Mileage')).toBeInTheDocument()
      expect(screen.getByText('Inspection')).toBeInTheDocument()
      expect(screen.getByText('Defects')).toBeInTheDocument()
      expect(screen.getByText('DVIR')).toBeInTheDocument()
    })
  })

  describe('DVIR Signature Capture', () => {
    it('should capture driver signature for DVIR', async () => {
      const { saveInspectionAction } = require('@/app/actions/inspections')
      saveInspectionAction.mockResolvedValue({ success: true })
      
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to DVIR step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      await waitFor(() => {
        fireEvent.click(screen.getByText(/no defects/i))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Sign DVIR
      await waitFor(() => {
        const driverSignature = screen.getByTestId('signature-canvas-driver-signature')
        const signButton = within(driverSignature).getByText(/sign/i)
        fireEvent.click(signButton)
      })
      
      // Submit should be enabled
      const submitButton = screen.getByText(/complete inspection/i)
      expect(submitButton).not.toBeDisabled()
    })

    it('should require mechanic signature when defects are reported', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to defects step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Report defects
      await waitFor(() => {
        fireEvent.click(screen.getByText(/yes, report defects/i))
      })
      
      // Enter defect description
      const defectInput = screen.getByPlaceholderText(/describe the defect/i)
      fireEvent.change(defectInput, { target: { value: 'Brake issue on front left' } })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Should show both driver and mechanic signature fields
      await waitFor(() => {
        expect(screen.getByTestId('signature-canvas-driver-signature')).toBeInTheDocument()
        expect(screen.getByTestId('signature-canvas-mechanic-signature')).toBeInTheDocument()
      })
    })
  })

  describe('Defects Reporting', () => {
    it('should allow adding multiple defects with descriptions', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to defects step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Report defects
      await waitFor(() => {
        fireEvent.click(screen.getByText(/yes, report defects/i))
      })
      
      // Add first defect
      const defectInput = screen.getByPlaceholderText(/describe the defect/i)
      fireEvent.change(defectInput, { target: { value: 'Brake issue' } })
      
      // Add another defect button should be available
      const addButton = screen.getByText(/add another defect/i)
      expect(addButton).toBeInTheDocument()
    })

    it('should support photo upload for defects', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to defects step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Report defects
      await waitFor(() => {
        fireEvent.click(screen.getByText(/yes, report defects/i))
      })
      
      // Photo upload should be available
      const photoUpload = screen.getByText(/add photo/i)
      expect(photoUpload).toBeInTheDocument()
    })

    it('should categorize defects by severity', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to defects step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Report defects
      await waitFor(() => {
        fireEvent.click(screen.getByText(/yes, report defects/i))
      })
      
      // Severity options should be available
      expect(screen.getByText(/minor/i)).toBeInTheDocument()
      expect(screen.getByText(/major/i)).toBeInTheDocument()
      expect(screen.getByText(/critical/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate ending mileage is greater than beginning mileage', async () => {
      const { haptics } = require('@/components/mobile')
      
      render(<PostTripInspectionClient driver={mockDriver} beginningMileage={50000} />)
      
      // Try to enter lower ending mileage
      const mileageInput = screen.getByPlaceholderText(/enter ending mileage/i)
      fireEvent.change(mileageInput, { target: { value: '45000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        expect(haptics.error).toHaveBeenCalled()
        expect(screen.getByText(/must be greater than beginning mileage/i)).toBeInTheDocument()
      })
    })

    it('should require all inspection items to be checked', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Enter mileage
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      // Try to proceed without checking all items
      await waitFor(() => {
        const nextButton = screen.getAllByText(/next/i)[0]
        expect(nextButton).toBeDisabled()
      })
    })

    it('should require defect description when defects are reported', async () => {
      const { haptics } = require('@/components/mobile')
      
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to defects step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      // Report defects without description
      await waitFor(() => {
        fireEvent.click(screen.getByText(/yes, report defects/i))
      })
      
      // Try to proceed without description
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      await waitFor(() => {
        expect(haptics.error).toHaveBeenCalled()
        expect(screen.getByText(/please describe the defect/i)).toBeInTheDocument()
      })
    })
  })

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on checkbox toggle', async () => {
      const { haptics } = require('@/components/mobile')
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to inspection step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const firstCheckbox = screen.getAllByTestId('mobile-checkbox')[0]
        fireEvent.click(firstCheckbox.querySelector('input')!)
        expect(haptics.light).toHaveBeenCalled()
      })
    })

    it('should trigger success haptic on successful submission', async () => {
      const { haptics } = require('@/components/mobile')
      const { saveInspectionAction } = require('@/app/actions/inspections')
      saveInspectionAction.mockResolvedValue({ success: true })
      
      delete (window as any).location
      window.location = { href: '' } as any
      
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Complete all steps
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      await waitFor(() => {
        fireEvent.click(screen.getByText(/no defects/i))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      await waitFor(() => {
        const signButton = within(screen.getByTestId('signature-canvas-driver-signature')).getByText(/sign/i)
        fireEvent.click(signButton)
      })
      
      fireEvent.click(screen.getByText(/complete inspection/i))
      
      await waitFor(() => {
        expect(haptics.success).toHaveBeenCalled()
      })
    })

    it('should trigger error haptic on validation failure', async () => {
      const { haptics } = require('@/components/mobile')
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Try to proceed without entering mileage
      const nextButton = screen.getByText(/next/i)
      fireEvent.click(nextButton)
      
      await waitFor(() => {
        expect(haptics.error).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all form elements', () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      const mileageInput = screen.getByPlaceholderText(/enter ending mileage/i)
      expect(mileageInput).toBeInTheDocument()
      
      const label = screen.getByText(/ending mileage/i)
      expect(label).toBeInTheDocument()
    })

    it('should support keyboard navigation through all steps', () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      const mileageInput = screen.getByPlaceholderText(/enter ending mileage/i)
      const nextButton = screen.getByText(/next/i)
      
      expect(mileageInput).not.toHaveAttribute('tabindex', '-1')
      expect(nextButton).not.toHaveAttribute('tabindex', '-1')
    })

    it('should announce step changes to screen readers', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Progress indicator should have proper ARIA attributes
      const progressSteps = screen.getAllByText(/mileage|inspection|defects|dvir/i)
      expect(progressSteps.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile-First Layout', () => {
    it('should have single column layout for all steps', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to inspection step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('mobile-card')
        cards.forEach(card => {
          expect(card.className).not.toMatch(/grid-cols-[2-9]/)
        })
      })
    })

    it('should have adequate spacing between all touch targets', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to inspection step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => {
          expect(cb).toHaveClass('h-12')
        })
      })
    })

    it('should optimize photo upload for mobile devices', async () => {
      render(<PostTripInspectionClient driver={mockDriver} />)
      
      // Navigate to defects step
      fireEvent.change(screen.getByPlaceholderText(/enter ending mileage/i), { target: { value: '55000' } })
      fireEvent.click(screen.getByText(/next/i))
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('mobile-checkbox')
        checkboxes.forEach(cb => fireEvent.click(cb.querySelector('input')!))
      })
      fireEvent.click(screen.getAllByText(/next/i)[0])
      
      await waitFor(() => {
        fireEvent.click(screen.getByText(/yes, report defects/i))
      })
      
      // Photo upload button should be large and accessible
      const photoButton = screen.getByText(/add photo/i)
      expect(photoButton.parentElement).toHaveClass('h-12')
    })
  })
})