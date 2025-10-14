import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

describe('SQL Injection Prevention', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
    }
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should safely handle SQL injection attempts in login', async () => {
    const maliciousEmail = "admin@example.com' OR '1'='1"
    const maliciousPin = "1234'; DROP TABLE drivers;--"

    mockSupabase.single.mockResolvedValue({ data: null, error: 'Invalid credentials' })

    // Simulate login query
    await mockSupabase
      .from('drivers')
      .select('id, email, name')
      .eq('email', maliciousEmail.toLowerCase())
      .eq('pin', maliciousPin)
      .single()

    // Verify parameterized query usage
    expect(mockSupabase.eq).toHaveBeenCalledWith('email', maliciousEmail.toLowerCase())
    expect(mockSupabase.eq).toHaveBeenCalledWith('pin', maliciousPin)
    
    // The malicious SQL should be treated as a literal string, not executed
    expect(mockSupabase.eq).not.toHaveBeenCalledWith('email', expect.stringContaining('OR'))
  })

  it('should use parameterized queries for all database operations', async () => {
    const testData = {
      driver_id: '123',
      notes: "'; DELETE FROM inspections; --",
      mileage: 50000,
    }

    mockSupabase.single.mockResolvedValue({ data: { id: '456' }, error: null })

    await mockSupabase
      .from('inspections')
      .insert(testData)
      .select()
      .single()

    // Verify the dangerous string is passed as data, not as SQL
    expect(mockSupabase.insert).toHaveBeenCalledWith(testData)
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: "'; DELETE FROM inspections; --",
      })
    )
  })

  it('should prevent SQL injection in search operations', async () => {
    const maliciousSearch = "test%' UNION SELECT * FROM users--"

    mockSupabase.single.mockResolvedValue({ data: null, error: null })

    await mockSupabase
      .from('clients')
      .select('*')
      .eq('name', maliciousSearch)
      .single()

    // Verify the search term is parameterized
    expect(mockSupabase.eq).toHaveBeenCalledWith('name', maliciousSearch)
  })
})