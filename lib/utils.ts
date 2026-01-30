import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and merges Tailwind classes properly
 * This prevents conflicts between Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a cryptographically secure random UUID
 * Works in both browser and Node.js environments
 *
 * @returns A UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateSecureId(): string {
  // crypto.randomUUID() is available in modern browsers and Node.js 19+
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback using crypto.getRandomValues for older environments
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version (4) and variant (RFC4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return Array.from(bytes)
      .map((b, i) => {
        const hex = b.toString(16).padStart(2, '0');
        return [4, 6, 8, 10].includes(i) ? `-${hex}` : hex;
      })
      .join('');
  }
  // Last resort fallback (should never reach here in modern environments)
  throw new Error('No secure random source available');
}

/**
 * Generate a short secure ID with a prefix
 * Useful for human-readable identifiers like proposal numbers, request IDs, etc.
 *
 * @param prefix - Optional prefix for the ID (e.g., "PROP", "REQ", "ERR")
 * @returns A prefixed short ID (e.g., "PROP-1706234567-a3f9b2c1")
 */
export function generatePrefixedId(prefix?: string): string {
  const uuid = generateSecureId();
  const shortId = uuid.replace(/-/g, '').substring(0, 8);
  const timestamp = Date.now();
  return prefix ? `${prefix}-${timestamp}-${shortId}` : `${timestamp}-${shortId}`;
}

/**
 * Generate a secure random string of specified length
 * Uses cryptographically secure random bytes
 *
 * @param length - Length of the string to generate (default: 16)
 * @param charset - Character set to use (default: alphanumeric)
 * @returns A random string of the specified length
 */
export function generateSecureString(
  length: number = 16,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('No secure random source available');
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => charset[b % charset.length])
    .join('');
}
