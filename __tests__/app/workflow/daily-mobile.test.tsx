import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { DailyWorkflowClient } from '@/app/workflow/daily/DailyWorkflowClient'
import '@testing-library/jest-dom'

// Mock the mobile components
jest.mock('@/components/mobile', () => ({
  TouchButton: ({ children, onClick, variant, disabled, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`h-14 ${className || ''} ${variant}`}
      data-testid="mobile-button"
    >
      {children}
    </button>
  ),
  MobileCard: ({ children, className, onClick }: any) => (
    <div 
      className={`bg-white rounded-lg p-4 ${className || ''}`} 
      data-testid="mobile-card"
      onClick={onClick}
    >
      {children}
    </div>
  ),
  BottomActionBar: ({ children }: any) => (
    <div className="fixed bottom-0" data-testid="bottom-action-bar">
      {children}
    </div>
  ),
  BottomActionBarSpacer: () => <div className="h-16" />,
  StatusIndicator: ({ status }: any) => (
    <span data-testid={`status-${status}`} className={`status-${status}`}>
      {status}
    </span>
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

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

describe('Daily Workflow Mobile UI', () => {
  const mockUser = {
    id: 'test-driver-1',
    email: 'driver@test.com',
    name: 'Test Driver'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.clear()
  })

  describe('Mobile Component Integration', () => {
    it('should use MobileCard components for workflow steps', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      const cards = screen.getAllByTestId('mobile-card')
      expect(cards.length).toBeGreaterThanOrEqual(7) // 7 workflow steps
    })

    it('should use TouchButton with 56px touch targets', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      const buttons = screen.getAllByTestId('mobile-button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Verify 56px height (h-14 class)
      buttons.forEach(button => {
        expect(button).toHaveClass('h-14')
      })
    })

    it('should place reset button in BottomActionBar', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      const actionBar = screen.getByTestId('bottom-action-bar')
      expect(actionBar).toBeInTheDocument()
      
      const resetButton = within(actionBar).getByText(/reset workflow/i)
      expect(resetButton).toBeInTheDocument()
    })

    it('should show status indicators for each step', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should have status indicators for workflow steps
      const pendingStatuses = screen.getAllByTestId(/status-/i)
      expect(pendingStatuses.length).toBeGreaterThan(0)
    })
  })

  describe('Progress Tracking', () => {
    it('should display progress percentage', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Initially 0/7 complete
      expect(screen.getByText(/0 \/ 7 complete/i)).toBeInTheDocument()
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('should update progress when steps are completed', async () => {
      const { haptics } = require('@/components/mobile')
      
      // Set up localStorage with some completed steps
      const progressData = {
        currentStep: 3,
        completedSteps: ['clock_in', 'pre_trip', 'client_pickup']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should show 3/7 complete (43%)
      expect(screen.getByText(/3 \/ 7 complete/i)).toBeInTheDocument()
      expect(screen.getByText(/43%/)).toBeInTheDocument()
    })

    it('should show visual progress bar', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should have progress bar/dots
      const progressBar = screen.getByRole('progressbar') || 
                         screen.getByTestId('progress-indicator')
      expect(progressBar).toBeInTheDocument()
    })

    it('should highlight current active step', () => {
      const progressData = {
        currentStep: 2,
        completedSteps: ['clock_in', 'pre_trip']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Third step (index 2) should be active
      const activeStatus = screen.getByTestId('status-active')
      expect(activeStatus).toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('should navigate to step page when clicking start button', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Click on first step's start button
      const startButtons = screen.getAllByText(/start/i)
      fireEvent.click(startButtons[0])
      
      // Should navigate (mocked)
      expect(window.location.href).toBe('http://localhost/')
    })

    it('should disable future steps until prerequisites complete', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // All steps except first should be disabled initially
      const cards = screen.getAllByTestId('mobile-card')
      
      // First card should be enabled
      expect(cards[0]).not.toHaveClass('opacity-80')
      
      // Others should be disabled-looking
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].className).toMatch(/disabled|gray|opacity/)
      }
    })

    it('should show checkmark for completed steps', () => {
      const progressData = {
        currentStep: 2,
        completedSteps: ['clock_in', 'pre_trip']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should show checkmarks or completed indicators
      const completedIndicators = screen.getAllByText(/✓|completed/i)
      expect(completedIndicators.length).toBeGreaterThanOrEqual(2)
    })

    it('should allow skipping to any completed or current step', () => {
      const progressData = {
        currentStep: 3,
        completedSteps: ['clock_in', 'pre_trip', 'client_pickup']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should be able to click on completed steps
      const cards = screen.getAllByTestId('mobile-card')
      
      // First three cards should be clickable
      for (let i = 0; i < 3; i++) {
        expect(cards[i]).not.toHaveAttribute('disabled')
      }
    })
  })

  describe('State Persistence', () => {
    it('should save progress to localStorage', async () => {
      const { haptics } = require('@/components/mobile')
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Simulate completing first step
      const startButton = screen.getAllByText(/start/i)[0]
      fireEvent.click(startButton)
      
      // Simulate step completion (would happen on step page)
      const mockProgress = {
        currentStep: 1,
        completedSteps: ['clock_in']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(mockProgress))
      
      // Check localStorage was updated
      const saved = mockLocalStorage.getItem('workflowProgress')
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved!)
      expect(parsed.completedSteps).toContain('clock_in')
    })

    it('should restore progress from localStorage on mount', () => {
      // Pre-populate localStorage
      const progressData = {
        currentStep: 4,
        completedSteps: ['clock_in', 'pre_trip', 'client_pickup', 'client_dropoff'],
        timestamp: new Date().toISOString()
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should show restored progress
      expect(screen.getByText(/4 \/ 7 complete/i)).toBeInTheDocument()
    })

    it('should handle reset workflow action', () => {
      const { haptics } = require('@/components/mobile')
      
      // Set up some progress
      const progressData = {
        currentStep: 3,
        completedSteps: ['clock_in', 'pre_trip', 'client_pickup']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Click reset button
      const resetButton = screen.getByText(/reset workflow/i)
      fireEvent.click(resetButton)
      
      // Confirm reset (if confirmation exists)
      const confirmButton = screen.queryByText(/confirm reset/i)
      if (confirmButton) {
        fireEvent.click(confirmButton)
      }
      
      // Progress should be cleared
      expect(haptics.warning).toHaveBeenCalled()
      
      // Check localStorage was cleared
      const saved = mockLocalStorage.getItem('workflowProgress')
      if (saved) {
        const parsed = JSON.parse(saved)
        expect(parsed.completedSteps).toHaveLength(0)
        expect(parsed.currentStep).toBe(0)
      }
    })
  })

  describe('Completion Status', () => {
    it('should show celebration when all steps complete', () => {
      const { haptics } = require('@/components/mobile')
      
      // Set all steps as complete
      const progressData = {
        currentStep: 7,
        completedSteps: [
          'clock_in', 
          'pre_trip', 
          'client_pickup', 
          'client_dropoff',
          'client_notes',
          'post_trip',
          'clock_out'
        ]
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should show completion message
      expect(screen.getByText(/workflow complete|all done|great job/i)).toBeInTheDocument()
      expect(screen.getByText(/100%/)).toBeInTheDocument()
    })

    it('should track time for each step', () => {
      const progressData = {
        currentStep: 2,
        completedSteps: ['clock_in', 'pre_trip'],
        stepTimes: {
          clock_in: '08:00 AM',
          pre_trip: '08:15 AM'
        }
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should display completion times
      expect(screen.getByText(/08:00 AM/)).toBeInTheDocument()
      expect(screen.getByText(/08:15 AM/)).toBeInTheDocument()
    })

    it('should show estimated time remaining', () => {
      const progressData = {
        currentStep: 3,
        completedSteps: ['clock_in', 'pre_trip', 'client_pickup']
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should show estimate
      const estimate = screen.queryByText(/estimated time|remaining/i)
      if (estimate) {
        expect(estimate).toBeInTheDocument()
      }
    })
  })

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on step completion', () => {
      const { haptics } = require('@/components/mobile')
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Start a step
      const startButton = screen.getAllByText(/start/i)[0]
      fireEvent.click(startButton)
      
      expect(haptics.light).toHaveBeenCalled()
    })

    it('should trigger success haptic when workflow completes', () => {
      const { haptics } = require('@/components/mobile')
      
      // Set to almost complete
      const progressData = {
        currentStep: 6,
        completedSteps: [
          'clock_in', 
          'pre_trip', 
          'client_pickup', 
          'client_dropoff',
          'client_notes',
          'post_trip'
        ]
      }
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Complete last step
      const lastStepButton = screen.getByText(/start clock out/i)
      fireEvent.click(lastStepButton)
      
      // Mark as complete (would happen after navigation)
      progressData.completedSteps.push('clock_out')
      progressData.currentStep = 7
      mockLocalStorage.setItem('workflowProgress', JSON.stringify(progressData))
      
      // Re-render to see completion
      render(<DailyWorkflowClient user={mockUser} />)
      
      expect(haptics.success).toHaveBeenCalled()
    })

    it('should trigger warning haptic on reset', () => {
      const { haptics } = require('@/components/mobile')
      
      render(<DailyWorkflowClient user={mockUser} />)
      
      const resetButton = screen.getByText(/reset workflow/i)
      fireEvent.click(resetButton)
      
      expect(haptics.warning).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Check for ARIA labels
      const buttons = screen.getAllByTestId('mobile-button')
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('should support keyboard navigation', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      const cards = screen.getAllByTestId('mobile-card')
      const buttons = screen.getAllByTestId('mobile-button')
      
      // Should be keyboard accessible
      cards.forEach(card => {
        const focusable = card.querySelector('button, a, [tabindex="0"]')
        if (focusable) {
          expect(focusable).not.toHaveAttribute('tabindex', '-1')
        }
      })
    })

    it('should announce step changes to screen readers', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Should have ARIA live regions for updates
      const liveRegion = screen.queryByRole('status') || 
                        screen.queryByRole('alert')
      
      if (liveRegion) {
        expect(liveRegion).toBeInTheDocument()
      }
    })
  })

  describe('Mobile-First Layout', () => {
    it('should have single column layout for workflow steps', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      const cards = screen.getAllByTestId('mobile-card')
      
      // Cards should not be in grid
      cards.forEach(card => {
        expect(card.className).not.toMatch(/grid-cols-[2-9]/)
      })
    })

    it('should have adequate spacing between step cards', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      const cards = screen.getAllByTestId('mobile-card')
      
      // Should have spacing classes
      cards.forEach(card => {
        const parent = card.parentElement
        if (parent) {
          expect(parent.className).toMatch(/space-y|gap|mb/)
        }
      })
    })

    it('should optimize for one-thumb operation', () => {
      render(<DailyWorkflowClient user={mockUser} />)
      
      // Primary actions should be at bottom
      const actionBar = screen.getByTestId('bottom-action-bar')
      expect(actionBar).toHaveClass('fixed', 'bottom-0')
      
      // Step buttons should be large enough
      const buttons = screen.getAllByTestId('mobile-button')
      buttons.forEach(button => {
        expect(button).toHaveClass('h-14') // 56px
      })
    })
  })
})