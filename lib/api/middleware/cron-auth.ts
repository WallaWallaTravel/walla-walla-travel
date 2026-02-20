import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withErrorHandling, UnauthorizedError } from './error-handler';

/**
 * Cron Job Authentication Middleware
 *
 * Fail-closed: Requires CRON_SECRET to be set AND a matching
 * Authorization: Bearer <token> header on every request.
 *
 * Usage:
 * ```ts
 * export const POST = withCronAuth(async (request) => {
 *   // handler code - only runs if cron secret validated
 * });
 * ```
 */
export function withCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return withErrorHandling(async (request: NextRequest) => {
    const cronSecret = process.env.CRON_SECRET;

    // Fail-closed: if CRON_SECRET is not configured, reject all requests
    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not set — all cron requests denied');
      throw new UnauthorizedError('Cron authentication not configured');
    }

    // Accept Bearer token in Authorization header
    const authHeader = request.headers.get('authorization');
    // Also accept x-cron-secret header (Vercel cron uses this)
    const xCronSecret = request.headers.get('x-cron-secret');

    const isAuthorized =
      (authHeader === `Bearer ${cronSecret}`) ||
      (xCronSecret === cronSecret);

    if (!isAuthorized) {
      logger.warn('Unauthorized cron request', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: request.nextUrl.pathname,
        hasAuthHeader: !!authHeader,
        hasXCronSecret: !!xCronSecret,
      });
      throw new UnauthorizedError('Invalid cron authentication');
    }

    return await handler(request);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}
