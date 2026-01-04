import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * CSRF Protection Middleware
 *
 * Implements Double Submit Cookie pattern:
 * 1. Server sets a CSRF token in a cookie
 * 2. Client must include the same token in X-CSRF-Token header
 * 3. Server validates they match
 */

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token from request
 * Compares cookie token with header token
 */
export async function validateCSRF(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const storedToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both must exist and match
  if (!storedToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(storedToken, headerToken)
}

/**
 * Constant-time string comparison
 * Prevents timing attacks by always comparing full length
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Set CSRF token cookie in response
 */
export function setCSRFCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCSRFToken()

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 *
 * Usage:
 * ```ts
 * export const POST = withCSRF(async (request) => {
 *   // Handler code
 * })
 * ```
 */
export function withCSRF<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Only validate on state-changing methods
    const method = request.method.toUpperCase()
    const mutationMethods = ['POST', 'PUT', 'DELETE', 'PATCH']

    if (mutationMethods.includes(method)) {
      const isValid = await validateCSRF(request)

      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Invalid or missing CSRF token',
            code: 'CSRF_VALIDATION_FAILED'
          },
          { status: 403 }
        )
      }
    }

    return handler(request, ...args)
  }
}

/**
 * Get or create CSRF token for client
 * Call this from a GET endpoint to provide token to frontend
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value

  if (!token) {
    token = generateCSRFToken()
    // Note: Cookie will be set in the response
  }

  return token
}

/**
 * React hook helper - returns token setup for fetch calls
 *
 * Frontend usage:
 * ```ts
 * const csrfToken = document.cookie
 *   .split('; ')
 *   .find(row => row.startsWith('csrf-token='))
 *   ?.split('=')[1]
 *
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': csrfToken
 *   },
 *   body: JSON.stringify(data)
 * })
 * ```
 */
