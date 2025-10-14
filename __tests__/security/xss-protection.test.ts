import { sanitizeText, sanitizeHtml, sanitizeNumber } from '@/lib/security'
import DOMPurify from 'isomorphic-dompurify'

describe('XSS Protection', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags from text input', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello'
      const result = sanitizeText(maliciousInput)
      expect(result).toBe('Hello')
    })

    it('should escape angle brackets', () => {
      const input = 'Test <tag> content'
      const result = sanitizeText(input)
      expect(result).toBe('Test  content')
    })

    it('should trim whitespace', () => {
      const input = '  Safe content  '
      const result = sanitizeText(input)
      expect(result).toBe('Safe content')
    })
  })

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<b>Bold</b> and <i>italic</i> text'
      const result = sanitizeHtml(input)
      expect(result).toBe('<b>Bold</b> and <i>italic</i> text')
    })

    it('should remove dangerous tags', () => {
      const maliciousInput = '<script>alert("XSS")</script><b>Safe</b>'
      const result = sanitizeHtml(maliciousInput)
      expect(result).toBe('<b>Safe</b>')
    })

    it('should remove event handlers', () => {
      const input = '<b onclick="alert(\'XSS\')">Click me</b>'
      const result = sanitizeHtml(input)
      expect(result).toBe('<b>Click me</b>')
    })

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>'
      const result = sanitizeHtml(input)
      expect(result).toBe('Link')
    })
  })

  describe('sanitizeNumber', () => {
    it('should validate numeric strings', () => {
      expect(sanitizeNumber('123')).toBe(123)
      expect(sanitizeNumber('123.45')).toBe(123.45)
    })

    it('should return null for non-numeric input', () => {
      expect(sanitizeNumber('abc')).toBeNull()
      expect(sanitizeNumber('<script>123</script>')).toBeNull()
    })

    it('should handle numeric values', () => {
      expect(sanitizeNumber(456)).toBe(456)
    })
  })

  describe('User Input Display', () => {
    it('should sanitize user notes before display', () => {
      const userNotes = '<img src=x onerror="alert(\'XSS\')" /> Important note'
      const sanitized = DOMPurify.sanitize(userNotes, { ALLOWED_TAGS: [] })
      expect(sanitized).toBe(' Important note')
    })

    it('should prevent XSS in winery names', () => {
      const wineryName = 'Malicious<script>alert("XSS")</script>Winery'
      const sanitized = DOMPurify.sanitize(wineryName, { ALLOWED_TAGS: [] })
      expect(sanitized).toBe('MaliciousWinery')
    })
  })

  describe('Form Input Validation', () => {
    it('should validate mileage input', () => {
      const validMileage = '123456'
      const invalidMileage = '12345<script>alert("XSS")</script>'
      
      expect(/^\d{1,7}$/.test(validMileage)).toBe(true)
      expect(/^\d{1,7}$/.test(invalidMileage)).toBe(false)
    })

    it('should validate PIN format', () => {
      const validPin = '1234'
      const invalidPin = '1234<script>'
      
      expect(/^\d{4}$/.test(validPin)).toBe(true)
      expect(/^\d{4}$/.test(invalidPin)).toBe(false)
    })
  })
})