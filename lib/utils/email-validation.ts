/**
 * Disposable Email Domain Validation
 *
 * Protects sender reputation by rejecting throwaway/temporary email addresses
 * on customer-facing forms. Uses the maintained `disposable-email-domains` list
 * (120k+ domains).
 *
 * NOT applied to admin routes — admins may legitimately enter any email.
 */

import disposableDomains from 'disposable-email-domains';
import { z } from 'zod';

// Build a Set for O(1) lookups (array.includes is O(n))
const disposableSet = new Set(disposableDomains);

/**
 * Check if an email address uses a disposable/throwaway domain
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return disposableSet.has(domain);
}

/**
 * Validate an email domain — checks format + disposable status
 */
export function validateEmailDomain(email: string): { valid: boolean; reason?: string } {
  // Basic format check
  if (!email || !email.includes('@')) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || !domain.includes('.')) {
    return { valid: false, reason: 'Invalid email domain' };
  }

  // Disposable domain check
  if (disposableSet.has(domain)) {
    return { valid: false, reason: 'Please use a permanent email address' };
  }

  return { valid: true };
}

/**
 * Zod refinement that rejects disposable email domains.
 * Chain onto any z.string().email() field:
 *
 *   email: z.string().email().superRefine(noDisposableEmail)
 */
export const noDisposableEmail: Parameters<z.ZodString['superRefine']>[0] = (val, ctx) => {
  if (isDisposableEmail(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please use a permanent email address',
    });
  }
};
