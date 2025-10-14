import { render, screen } from '@testing-library/react'
import { DailyWorkflowClient } from '@/app/workflow/daily/DailyWorkflowClient'
import '@testing-library/jest-dom'

// Mock the mobile components with minimal implementation
jest.mock('@/components/mobile', () => ({
  TouchButton: ({ children }: any) => <button>{children}</button>,
  MobileCard: ({ children }: any) => <div data-testid="mobile-card">{children}</div>,
  BottomActionBar: ({ children }: any) => <div data-testid="bottom-action-bar">{children}</div>,
  BottomActionBarSpacer: () => <div />,
  StatusIndicator: ({ status }: any) => <span data-testid={`status-${status}`}>{status}</span>,
  AlertBanner: () => null,
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }
}))

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

describe('Daily Workflow Simple Test', () => {
  const mockUser = {
    id: 'test-driver-1',
    email: 'driver@test.com',
    name: 'Test Driver'
  }
  
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
  })
  
  it('should render without crashing', () => {
    render(<DailyWorkflowClient user={mockUser} />)
    
    expect(screen.getByText('Daily Workflow')).toBeInTheDocument()
    expect(screen.getByText(/Test Driver/)).toBeInTheDocument()
  })
  
  it('should display all 7 workflow steps', () => {
    render(<DailyWorkflowClient user={mockUser} />)
    
    expect(screen.getByText('Clock In')).toBeInTheDocument()
    expect(screen.getByText('Pre-Trip Inspection')).toBeInTheDocument()
    expect(screen.getByText('Client Pickup')).toBeInTheDocument()
    expect(screen.getByText('Client Drop-off')).toBeInTheDocument()
    expect(screen.getByText('Client Notes')).toBeInTheDocument()
    expect(screen.getByText('Post-Trip Inspection')).toBeInTheDocument()
    expect(screen.getByText('Clock Out')).toBeInTheDocument()
  })
  
  it('should show 0% progress initially', () => {
    render(<DailyWorkflowClient user={mockUser} />)
    
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 7 Complete/)).toBeInTheDocument()
  })
  
  it('should have reset workflow button in action bar', () => {
    render(<DailyWorkflowClient user={mockUser} />)
    
    const actionBar = screen.getByTestId('bottom-action-bar')
    expect(actionBar).toBeInTheDocument()
    
    const resetButton = screen.getByText('Reset Workflow')
    expect(resetButton).toBeInTheDocument()
  })
  
  it('should use mobile cards for each step', () => {
    render(<DailyWorkflowClient user={mockUser} />)
    
    const cards = screen.getAllByTestId('mobile-card')
    expect(cards.length).toBeGreaterThanOrEqual(7)
  })
})