import DOMPurify from 'isomorphic-dompurify'

// Input validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  pin: /^\d{4}$/,
  mileage: /^\d{1,7}$/,
  phone: /^\+?[\d\s-()]+$/,
}

// Sanitize HTML content to prevent XSS
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  })
}

// Sanitize plain text input
export function sanitizeText(input: string): string {
  // Remove all content between angle brackets (including the brackets)
  return input.trim().replace(/<[^>]*>.*?<\/[^>]*>/g, '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
}

// Validate and sanitize numeric input
export function sanitizeNumber(input: string | number): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input
  return isNaN(num) ? null : num
}

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  check(identifier: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(identifier) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs)
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(identifier, validAttempts)
    return true
  }
  
  reset(identifier: string) {
    this.attempts.delete(identifier)
  }
}

// CSRF token generation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// File upload validation
export function validateFileUpload(file: File, options: {
  maxSizeMB?: number
  allowedTypes?: string[]
} = {}): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'] } = options
  
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }
  
  // Check file name for malicious patterns first
  const dangerousPatterns = /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|com|scr)$/i
  if (dangerousPatterns.test(file.name)) {
    return { valid: false, error: 'Potentially dangerous file type' }
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' }
  }
  
  return { valid: true }
}