import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test_db'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'
process.env.SESSION_SECRET = 'test-secret-key-for-testing'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock database module
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  getPool: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn()
  })),
  healthCheck: jest.fn(() => Promise.resolve(true)),
  closePool: jest.fn(),
}))

// Mock session module
jest.mock('@/lib/session', () => ({
  getSession: jest.fn(() => Promise.resolve({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'driver',
    isLoggedIn: true,
    save: jest.fn(),
    destroy: jest.fn(),
  })),
  getCurrentUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'driver',
  })),
}))

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}