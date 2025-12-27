/**
 * Session Management
 * 
 * JWT-based session management with secure cookies
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

/**
 * Get cookie domain for cross-subdomain sharing
 * In production, cookies are shared across all *.wallawalla.travel subdomains
 * In development, no domain is set (localhost doesn't support subdomain cookies)
 */
function getCookieDomain(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return '.wallawalla.travel';
  }
  return undefined;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'driver';
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
    console.error('[Session] Verification failed:', error);
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
export async function requireAuth(allowedRoles?: Array<'admin' | 'driver'>): Promise<SessionPayload> {
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
