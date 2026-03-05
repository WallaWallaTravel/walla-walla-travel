/**
 * Guest Authentication Middleware
 *
 * @module lib/api/middleware/guest-auth
 * @description Provides withGuestAuth wrapper for API routes that require
 * a verified guest session. Guest sessions use a separate JWT cookie
 * ('guest_session') so they don't conflict with admin/driver sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { withErrorHandling, UnauthorizedError } from './error-handler';
import { logger } from '@/lib/logger';

// ============================================================================
// Constants
// ============================================================================

const GUEST_COOKIE_NAME = 'guest_session';
const GUEST_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Missing required SESSION_SECRET environment variable.');
  }
  return new TextEncoder().encode(secret);
}

// ============================================================================
// Guest Session Types
// ============================================================================

export interface GuestSession {
  guestProfileId: number;
  email: string;
}

interface GuestSessionPayload {
  guest: {
    id: number;
    email: string;
  };
  iat: number;
  exp: number;
}

export type GuestAuthenticatedHandler = (
  request: NextRequest,
  guestSession: GuestSession,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: { params: Promise<any> }
) => Promise<NextResponse<unknown>>;

// ============================================================================
// JWT Helpers
// ============================================================================

/**
 * Create a guest session JWT.
 */
export async function createGuestSession(
  guestProfileId: number,
  email: string
): Promise<string> {
  const secret = getSessionSecret();

  return new SignJWT({ guest: { id: guestProfileId, email } })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verify a guest session JWT.
 */
async function verifyGuestSession(
  token: string
): Promise<GuestSessionPayload | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as GuestSessionPayload;
  } catch {
    return null;
  }
}

// ============================================================================
// Cookie Helpers
// ============================================================================

/**
 * Set the guest session cookie on a response.
 */
export function setGuestSessionCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set({
    name: GUEST_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GUEST_SESSION_DURATION / 1000,
    path: '/',
  });
  return response;
}

// ============================================================================
// Middleware Wrappers
// ============================================================================

/**
 * Require guest authentication.
 * Reads 'guest_session' cookie, verifies JWT, passes GuestSession to handler.
 */
export function withGuestAuth(
  handler: GuestAuthenticatedHandler
): (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse<unknown>> {
  return withErrorHandling(async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;

    if (!token) {
      throw new UnauthorizedError('Guest authentication required');
    }

    const payload = await verifyGuestSession(token);
    if (!payload?.guest?.id) {
      throw new UnauthorizedError('Invalid guest session');
    }

    const guestSession: GuestSession = {
      guestProfileId: payload.guest.id,
      email: payload.guest.email || '',
    };

    return handler(request, guestSession, context);
  });
}

/**
 * Optional guest authentication.
 * If a valid guest session exists, passes it; otherwise passes null.
 */
export function withOptionalGuestAuth(
  handler: (
    request: NextRequest,
    guestSession: GuestSession | null,
    context?: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse<unknown>>
): (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse<unknown>> {
  return withErrorHandling(async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    let guestSession: GuestSession | null = null;

    try {
      const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifyGuestSession(token);
        if (payload?.guest?.id) {
          guestSession = {
            guestProfileId: payload.guest.id,
            email: payload.guest.email || '',
          };
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.debug('Optional guest auth failed', { error: msg });
    }

    return handler(request, guestSession, context);
  });
}
