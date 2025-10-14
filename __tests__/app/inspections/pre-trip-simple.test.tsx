import { render, screen } from '@testing-library/react'
import { PreTripInspectionClient } from '@/app/inspections/pre-trip/PreTripInspectionClient'
import '@testing-library/jest-dom'

// Mock the mobile components with minimal implementation
jest.mock('@/components/mobile', () => ({
  TouchButton: ({ children }: any) => <button>{children}</button>,
  MobileButton: ({ children }: any) => <button>{children}</button>,
  MobileCheckbox: ({ label }: any) => <div>{label}</div>,
  MobileInput: ({ placeholder }: any) => <input placeholder={placeholder} />,
  BottomActionBar: ({ children }: any) => <div>{children}</div>,
  BottomActionBarSpacer: () => <div />,
  SignatureCanvas: () => <div>Signature Canvas</div>,
  MobileCard: ({ children }: any) => <div>{children}</div>,
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

// Mock server action
jest.mock('@/app/actions/inspections', () => ({
  saveInspectionAction: jest.fn()
}))

describe('Pre-Trip Inspection Simple Test', () => {
  it('should render without crashing', () => {
    const mockDriver = {
      id: 'test-driver-1',
      email: 'driver@test.com',
      name: 'Test Driver'
    }
    
    render(<PreTripInspectionClient driver={mockDriver} />)
    
    expect(screen.getByText('Pre-Trip Inspection')).toBeInTheDocument()
    expect(screen.getByText('Driver: Test Driver')).toBeInTheDocument()
  })
  
  it('should show mileage step initially', () => {
    const mockDriver = {
      id: 'test-driver-1',
      email: 'driver@test.com',
      name: 'Test Driver'
    }
    
    render(<PreTripInspectionClient driver={mockDriver} />)
    
    expect(screen.getByText('Enter Beginning Mileage')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter current mileage/i)).toBeInTheDocument()
  })
})