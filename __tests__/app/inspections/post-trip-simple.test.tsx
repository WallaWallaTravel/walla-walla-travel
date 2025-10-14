import { render, screen } from '@testing-library/react'
import { PostTripInspectionClient } from '@/app/inspections/post-trip/PostTripInspectionClient'
import '@testing-library/jest-dom'

// Mock the mobile components with minimal implementation
jest.mock('@/components/mobile', () => ({
  TouchButton: ({ children }: any) => <button>{children}</button>,
  MobileCheckbox: ({ label }: any) => <div>{label}</div>,
  MobileInput: ({ placeholder }: any) => <input placeholder={placeholder} />,
  BottomActionBar: ({ children }: any) => <div>{children}</div>,
  BottomActionBarSpacer: () => <div />,
  SignatureCanvas: ({ label }: any) => <div>Signature Canvas - {label}</div>,
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

describe('Post-Trip Inspection Simple Test', () => {
  it('should render without crashing', () => {
    const mockDriver = {
      id: 'test-driver-1',
      email: 'driver@test.com',
      name: 'Test Driver'
    }
    
    render(<PostTripInspectionClient driver={mockDriver} beginningMileage={50000} />)
    
    expect(screen.getByText('Post-Trip Inspection (DVIR)')).toBeInTheDocument()
    expect(screen.getByText('Driver: Test Driver')).toBeInTheDocument()
  })
  
  it('should show mileage step initially', () => {
    const mockDriver = {
      id: 'test-driver-1',
      email: 'driver@test.com',
      name: 'Test Driver'
    }
    
    render(<PostTripInspectionClient driver={mockDriver} beginningMileage={50000} />)
    
    expect(screen.getByText('Vehicle Status')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter ending mileage/i)).toBeInTheDocument()
  })
  
  it('should display beginning mileage hint', () => {
    const mockDriver = {
      id: 'test-driver-1',
      email: 'driver@test.com',
      name: 'Test Driver'
    }
    
    render(<PostTripInspectionClient driver={mockDriver} beginningMileage={50000} />)
    
    expect(screen.getByText('Beginning mileage was 50000')).toBeInTheDocument()
  })
  
  it('should show 4-step progress indicator', () => {
    const mockDriver = {
      id: 'test-driver-1',
      email: 'driver@test.com',
      name: 'Test Driver'
    }
    
    render(<PostTripInspectionClient driver={mockDriver} />)
    
    expect(screen.getByText('Mileage')).toBeInTheDocument()
    expect(screen.getByText('Inspection')).toBeInTheDocument()
    expect(screen.getByText('Defects')).toBeInTheDocument()
    expect(screen.getByText('DVIR')).toBeInTheDocument()
  })
})