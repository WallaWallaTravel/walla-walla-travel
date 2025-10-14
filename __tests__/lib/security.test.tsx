import { patterns, generateCSRFToken } from '@/lib/security'

describe('Security Utilities', () => {
  describe('Input Validation Patterns', () => {
    it('should validate email addresses', () => {
      expect(patterns.email.test('user@example.com')).toBe(true)
      expect(patterns.email.test('user.name@company.co.uk')).toBe(true)
      expect(patterns.email.test('invalid-email')).toBe(false)
      expect(patterns.email.test('@example.com')).toBe(false)
      expect(patterns.email.test('user@')).toBe(false)
    })

    it('should validate PIN format', () => {
      expect(patterns.pin.test('1234')).toBe(true)
      expect(patterns.pin.test('0000')).toBe(true)
      expect(patterns.pin.test('123')).toBe(false) // Too short
      expect(patterns.pin.test('12345')).toBe(false) // Too long
      expect(patterns.pin.test('abcd')).toBe(false) // Not numeric
    })

    it('should validate mileage', () => {
      expect(patterns.mileage.test('0')).toBe(true)
      expect(patterns.mileage.test('123456')).toBe(true)
      expect(patterns.mileage.test('9999999')).toBe(true)
      expect(patterns.mileage.test('12345678')).toBe(false) // Too long
      expect(patterns.mileage.test('-100')).toBe(false) // Negative
      expect(patterns.mileage.test('abc')).toBe(false) // Not numeric
    })

    it('should validate phone numbers', () => {
      expect(patterns.phone.test('+1234567890')).toBe(true)
      expect(patterns.phone.test('123-456-7890')).toBe(true)
      expect(patterns.phone.test('(123) 456-7890')).toBe(true)
      expect(patterns.phone.test('1234567890')).toBe(true)
      expect(patterns.phone.test('phone')).toBe(false)
    })
  })

  describe('CSRF Token Generation', () => {
    it('should generate unique CSRF tokens', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()

      expect(token1).toBeTruthy()
      expect(token2).toBeTruthy()
      expect(token1).not.toBe(token2)
      expect(token1.length).toBe(64) // 32 bytes * 2 (hex)
    })

    it('should generate valid hex strings', () => {
      const token = generateCSRFToken()
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
    })
  })
})