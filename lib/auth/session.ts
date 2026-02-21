/**
 * Session Management
 *
 * JWT-based session management with secure cookies
 *
 * NOTE: This module is used in Edge middleware, so we cannot import
 * the logger (which uses Node.js APIs). Use console for any logging.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'session';

// SECURITY: Session secret MUST be set in environment
// Never fall back to a default value - this prevents production deployments
// with missing configuration from being vulnerable
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: SESSION_SECRET environment variable is required in production. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
    // Development only - use a consistent dev secret
    // eslint-disable-next-line no-console
    console.warn('[Session] WARNING: Using development session secret. Set SESSION_SECRET in production.');
    return new TextEncoder().encode('dev-only-secret-do-not-use-in-production-32chars');
  }
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

const SESSION_SECRET = getSessionSecret();
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_REFRESH_THRESHOLD = 3.5 * 24 * 60 * 60; // 3.5 days in seconds

/**
 * Get cookie domain for cross-subdomain sharing
 * In production on wallawalla.travel, cookies are shared across all subdomains
 * On vercel.app URLs or development, no domain is set (allows cookie to work on current hostname)
 */
function getCookieDomain(): string | undefined {
  // Don't set domain - let cookie work on current hostname
  // This allows both wallawalla.travel and vercel.app deployments to work
  return undefined;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'geology_admin' | 'driver' | 'partner' | 'organizer';
}

export interface SessionPayload {
  user: SessionUser;
  iat: number;
  exp: number;
}

/**
 * Create a new session token
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SESSION_SECRET);
  
  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Session] Verification failed', error);
    return null;
  }
}

/**
 * Get session from cookies (for Server Components and API routes)
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  return verifySession(token);
}

/**
 * Get session from request (for middleware)
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  return verifySession(token);
}

/**
 * Set session cookie in response
 * Cookie is shared across all *.wallawalla.travel subdomains in production
 */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  const domain = getCookieDomain();
  
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
    ...(domain && { domain }), // Only set domain in production
  });
  
  return response;
}

/**
 * Clear session cookie
 * Must use same domain as setSessionCookie to properly clear cross-subdomain cookies
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  const domain = getCookieDomain();
  
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    ...(domain && { domain }), // Only set domain in production
  });
  
  return response;
}

/**
 * Require authentication (throws redirect if not authenticated)
 */
export async function requireAuth(allowedRoles?: Array<'admin' | 'geology_admin' | 'driver' | 'partner' | 'organizer'>): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    throw new Error('REDIRECT:/login');
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new Error('REDIRECT:/login?error=forbidden');
  }

  return session;
}

/**
 * Check if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === 'admin';
}

/**
 * Check if user has driver role
 */
export async function isDriver(): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === 'driver';
}

/**
 * Check if user has partner role
 */
export async function isPartner(): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === 'partner';
}

/**
 * Check if user has organizer role
 */
export async function isOrganizer(): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === 'organizer';
}

/**
 * Check if a session token should be refreshed (sliding window).
 * Returns true if the token was issued more than SESSION_REFRESH_THRESHOLD seconds ago.
 */
export function shouldRefreshSession(session: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - session.iat) > SESSION_REFRESH_THRESHOLD;
}

/**
 * Refresh a session by issuing a new token and setting it on the response.
 * Used by middleware for sliding window session renewal.
 */
export async function refreshSessionOnResponse(
  session: SessionPayload,
  response: NextResponse
): Promise<NextResponse> {
  const newToken = await createSession(session.user);
  return setSessionCookie(response, newToken);
}
