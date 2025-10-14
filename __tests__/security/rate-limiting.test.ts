import { RateLimiter } from '@/lib/security'

describe('Rate Limiting', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter(3, 60000) // 3 attempts per minute
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should allow requests within limit', () => {
    const identifier = 'test@example.com'
    
    expect(limiter.check(identifier)).toBe(true)
    expect(limiter.check(identifier)).toBe(true)
    expect(limiter.check(identifier)).toBe(true)
  })

  it('should block requests exceeding limit', () => {
    const identifier = 'test@example.com'
    
    // Use up all attempts
    limiter.check(identifier)
    limiter.check(identifier)
    limiter.check(identifier)
    
    // Fourth attempt should be blocked
    expect(limiter.check(identifier)).toBe(false)
  })

  it('should reset after time window', () => {
    const identifier = 'test@example.com'
    
    // Use up all attempts
    limiter.check(identifier)
    limiter.check(identifier)
    limiter.check(identifier)
    expect(limiter.check(identifier)).toBe(false)
    
    // Advance time past the window
    jest.advanceTimersByTime(61000) // 61 seconds
    
    // Should be allowed again
    expect(limiter.check(identifier)).toBe(true)
  })

  it('should track different identifiers separately', () => {
    const user1 = 'user1@example.com'
    const user2 = 'user2@example.com'
    
    // Use up attempts for user1
    limiter.check(user1)
    limiter.check(user1)
    limiter.check(user1)
    expect(limiter.check(user1)).toBe(false)
    
    // user2 should still be allowed
    expect(limiter.check(user2)).toBe(true)
    expect(limiter.check(user2)).toBe(true)
  })

  it('should handle reset method', () => {
    const identifier = 'test@example.com'
    
    // Use up attempts
    limiter.check(identifier)
    limiter.check(identifier)
    limiter.check(identifier)
    expect(limiter.check(identifier)).toBe(false)
    
    // Reset the identifier
    limiter.reset(identifier)
    
    // Should be allowed again
    expect(limiter.check(identifier)).toBe(true)
  })

  it('should handle login brute force protection', () => {
    const loginLimiter = new RateLimiter(5, 300000) // 5 attempts per 5 minutes
    const ipAddress = '192.168.1.1'
    
    // Simulate failed login attempts
    for (let i = 0; i < 5; i++) {
      expect(loginLimiter.check(ipAddress)).toBe(true)
    }
    
    // Sixth attempt should be blocked
    expect(loginLimiter.check(ipAddress)).toBe(false)
  })
})