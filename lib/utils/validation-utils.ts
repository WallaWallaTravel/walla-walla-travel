/**
 * Validation Utilities
 * 
 * Common validation functions used across forms and API endpoints.
 * Consolidates validation logic for consistency and DRY principles.
 */

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone number validation (US format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Should have 10 or 11 digits (with or without country code)
  return digits.length === 10 || digits.length === 11;
}

/**
 * Format phone number to (XXX) XXX-XXXX
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone;
}

/**
 * ZIP code validation (US 5 or 9 digit)
 */
export function isValidZipCode(zip: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

/**
 * Credit card number validation (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, '');
  
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const issues: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain lowercase letters');
  }
  
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain uppercase letters');
  }
  
  if (!/\d/.test(password)) {
    issues.push('Password must contain numbers');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    issues.push('Password should contain special characters');
  }
  
  const isValid = issues.length === 0;
  
  if (isValid) {
    if (password.length >= 12 && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  return { isValid, strength, issues };
}

/**
 * Date validation
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
}

/**
 * Check if date is in the past
 */
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
}

/**
 * URL validation
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Redirect validation — prevents open redirect attacks.
 *
 * Internal redirects must be relative paths starting with "/" and must not
 * contain protocol-relative sequences ("//") that browsers interpret as
 * external URLs.
 */
export function isSafeInternalRedirect(path: string): boolean {
  // Must start with exactly one slash
  if (!path.startsWith('/')) return false;
  // Block protocol-relative URLs (//evil.com) and backslash tricks
  if (path.startsWith('//') || path.startsWith('/\\')) return false;
  // Block javascript: or data: schemes injected after path
  if (/[:\s]/i.test(path.split('?')[0].split('#')[0])) return false;
  return true;
}

/**
 * Validate an external redirect URL against an allowed-domains list.
 * Returns the normalized URL string if valid, or null if rejected.
 */
export function validateExternalRedirect(
  url: string,
  allowedDomains: string[]
): string | null {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(normalized);

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    // Block localhost / private IPs
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
      return null;
    }

    // Check against allowed domains (exact match or subdomain)
    const domainAllowed = allowedDomains.some((domain) =>
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
    if (!domainAllowed) return null;

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Number range validation
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * String length validation
 */
export function isValidLength(
  str: string,
  min: number,
  max?: number
): boolean {
  if (str.length < min) return false;
  if (max !== undefined && str.length > max) return false;
  return true;
}

/**
 * Alphanumeric validation
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Sanitize string for safe HTML display
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove special characters
 */
export function removeSpecialChars(str: string): string {
  return str.replace(/[^a-zA-Z0-9\s]/g, '');
}

/**
 * Validate object has required fields
 */
export function hasRequiredFields<T extends object>(
  obj: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every(field => {
    const value = obj[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Currency validation
 */
export function isValidCurrency(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0 && Number.isFinite(num);
}

/**
 * Format currency
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Validate file type
 */
export function isValidFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      return file.type.startsWith(category + '/');
    }
    return file.type === type;
  });
}

/**
 * Validate file size (in MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Trim and normalize whitespace
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Validate array has items
 */
export function isNonEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}




