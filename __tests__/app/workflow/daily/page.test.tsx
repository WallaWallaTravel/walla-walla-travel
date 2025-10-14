import { render } from '@testing-library/react'
import DailyWorkflow from '@/app/workflow/daily/page'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

jest.mock('@/lib/auth')
jest.mock('next/navigation')

// Mock the client component
jest.mock('@/app/workflow/daily/DailyWorkflowClient', () => {
  return function MockDailyWorkflowClient({ userEmail }: { userEmail: string }) {
    return <div data-testid="workflow-client">Daily Workflow for {userEmail}</div>
  }
})

describe('Daily Workflow Page (Server Component)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to login if not authenticated', async () => {
    ;(requireAuth as jest.Mock).mockResolvedValue(null)

    await DailyWorkflow()

    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('should render workflow client when authenticated', async () => {
    const mockSession = {
      user: { email: 'driver@example.com' }
    }
    ;(requireAuth as jest.Mock).mockResolvedValue(mockSession)

    const result = await DailyWorkflow()

    expect(redirect).not.toHaveBeenCalled()
    expect(result.props.userEmail).toBe('driver@example.com')
  })
})