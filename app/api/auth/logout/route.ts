/**
 * Logout API
 * POST /api/auth/logout
 *
 * Destroys session and clears cookie
 *
 * ✅ REFACTORED: Structured logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Get client IP from request headers (Next.js 15 removed request.ip)
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Get session to log who's logging out
    const session = await getSessionFromRequest(request);

    if (session) {
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

    return clearSessionCookie(response);
  } catch (error) {
    logger.error('Logout error', { error });

    // Even if there's an error, still clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out',
    });

    return clearSessionCookie(response);
  }
}

// Also support GET for simple logout links
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (session) {
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
  return clearSessionCookie(response);
}
