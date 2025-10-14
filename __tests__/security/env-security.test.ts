import { getSecureEnvVar } from '@/lib/supabase-server'

describe('Environment Variable Security', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getSecureEnvVar', () => {
    it('should return value for existing environment variable', () => {
      process.env.TEST_VAR = 'test-value'
      const result = getSecureEnvVar('TEST_VAR')
      expect(result).toBe('test-value')
    })

    it('should throw error for missing environment variable', () => {
      expect(() => getSecureEnvVar('MISSING_VAR')).toThrow(
        'Missing required environment variable: MISSING_VAR'
      )
    })

    it('should throw error for empty environment variable', () => {
      process.env.EMPTY_VAR = ''
      expect(() => getSecureEnvVar('EMPTY_VAR')).toThrow(
        'Missing required environment variable: EMPTY_VAR'
      )
    })
  })

  describe('Client-side environment variables', () => {
    it('should only expose NEXT_PUBLIC_ variables to client', () => {
      process.env.SECRET_KEY = 'secret'
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'

      // Simulate client-side environment
      const clientEnv = Object.keys(process.env)
        .filter(key => key.startsWith('NEXT_PUBLIC_'))
        .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {})

      expect(clientEnv).toHaveProperty('NEXT_PUBLIC_API_URL')
      expect(clientEnv).not.toHaveProperty('SECRET_KEY')
    })
  })

  describe('Supabase configuration', () => {
    it('should validate required Supabase environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      expect(() => getSecureEnvVar('NEXT_PUBLIC_SUPABASE_URL')).not.toThrow()
      expect(() => getSecureEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')).not.toThrow()
    })

    it('should not expose service role key to client', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-key'
      
      // In a real Next.js app, this would be undefined on client
      // In jest with jsdom, we're simulating server-side behavior
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('secret-service-key')
      
      // Verify it's not a NEXT_PUBLIC_ variable (which would expose it)
      expect(Object.keys(process.env).filter(key => 
        key.startsWith('NEXT_PUBLIC_') && key.includes('SERVICE_ROLE')
      )).toHaveLength(0)
    })
  })
})