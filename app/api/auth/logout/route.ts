/**
 * Logout API
 * POST /api/auth/logout
 *
 * Destroys session and clears cookie
 *
 * REFACTORED: Structured logging + withErrorHandling middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

/** Clear both old session and Auth.js session cookies */
function clearAllSessionCookies(response: NextResponse): NextResponse {
  clearSessionCookie(response);
  // Clear Auth.js session cookie
  const authJsCookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
  response.cookies.set({
    name: authJsCookieName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export const dynamic = 'force-dynamic';

// Get client IP from request headers (Next.js 15 removed request.ip)
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get session to log who's logging out
    const session = await getSessionFromRequest(request);

    if (session) {
      // Revoke server-side session if sid present
      if (session.sid) {
        const { sessionStoreService } = await import('@/lib/services/session-store.service');
        await sessionStoreService.revokeSession(session.sid).catch(err => {
          logger.warn('Failed to revoke server-side session', { error: err });
        });
      }

      // Log logout activity
      await query(
        `INSERT INTO user_activity_logs (user_id, action, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [session.user.id, 'logout', JSON.stringify({ ip: getClientIp(request) })]
      ).catch(err => {
        logger.warn('Failed to log logout activity', { error: err });
      });
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    return clearAllSessionCookies(response);
  } catch (error) {
    logger.error('Logout error', { error });

    // Even if there's an error, still clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out',
    });

    return clearAllSessionCookies(response);
  }
});

// Also support GET for simple logout links
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (session) {
    // Revoke server-side session if sid present
    if (session.sid) {
      const { sessionStoreService } = await import('@/lib/services/session-store.service');
      await sessionStoreService.revokeSession(session.sid).catch(err => {
        logger.warn('Failed to revoke server-side session', { error: err });
      });
    }

    await query(
      `INSERT INTO user_activity_logs (user_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [session.user.id, 'logout', JSON.stringify({ ip: getClientIp(request) })]
    ).catch(err => {
      logger.warn('Failed to log logout activity', { error: err });
    });
  }

  // Redirect to homepage
  const response = NextResponse.redirect(new URL('/', request.url));
  return clearAllSessionCookies(response);
});
