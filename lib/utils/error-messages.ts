/**
 * Error Message Utilities
 *
 * Extract human-readable error messages from any error type.
 * Handles: fetch Response errors, API JSON errors, Error instances, strings.
 *
 * Usage:
 *   catch (err) {
 *     toast(getApiErrorMessage(err), 'error');
 *   }
 */

/**
 * Extract a human-readable error message from any error type.
 * Handles: fetch Response errors, API JSON errors ({ error: "..." }),
 * Error instances, and plain strings.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const defaultMessage = fallback || 'An unexpected error occurred';

  if (!error) return defaultMessage;

  // Fetch response with JSON body: { error: "message" } or { message: "..." }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // API response shape: { error: "message" }
    if (typeof obj.error === 'string' && obj.error.length > 0) return obj.error;

    // API response shape: { message: "message" }
    if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;

    // Nested: { data: { error: "..." } }
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>;
      if (typeof data.error === 'string' && data.error.length > 0) return data.error;
      if (typeof data.message === 'string' && data.message.length > 0) return data.message;
    }
  }

  // Standard Error instance
  if (error instanceof Error) return error.message;

  // Plain string
  if (typeof error === 'string' && error.length > 0) return error;

  return defaultMessage;
}
