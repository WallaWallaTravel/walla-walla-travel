import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { withErrorHandling, UnauthorizedError } from './error-handler';

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns false if either value is empty.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Cron Job Authentication Middleware
 *
 * Fail-closed: Requires CRON_SECRET to be set AND a matching
 * Authorization: Bearer <token> header on every request.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param jobName - Identifier for monitoring/logging (e.g. 'cleanup-holds')
 * @param handler - The cron job handler function
 *
 * Usage:
 * ```ts
 * export const POST = withCronAuth('cleanup-holds', async (request) => {
 *   // handler code - only runs if cron secret validated
 * });
 * ```
 */
export function withCronAuth(
  jobName: string,
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return withErrorHandling(async (request: NextRequest) => {
    const cronSecret = process.env.CRON_SECRET;

    // Fail-closed: if CRON_SECRET is not configured, reject all requests
    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not set — all cron requests denied', {
        job: jobName,
      });
      throw new UnauthorizedError('Cron authentication not configured');
    }

    // Accept Bearer token in Authorization header
    const authHeader = request.headers.get('authorization');
    // Also accept x-cron-secret header (Vercel cron uses this)
    const xCronSecret = request.headers.get('x-cron-secret');

    // Extract token from Bearer header
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    const isAuthorized =
      safeCompare(bearerToken, cronSecret) ||
      safeCompare(xCronSecret || '', cronSecret);

    if (!isAuthorized) {
      logger.warn('Unauthorized cron request', {
        job: jobName,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: request.nextUrl.pathname,
        hasAuthHeader: !!authHeader,
        hasXCronSecret: !!xCronSecret,
      });
      throw new UnauthorizedError('Invalid cron authentication');
    }

    logger.info(`Cron job started: ${jobName}`, {
      job: jobName,
      path: request.nextUrl.pathname,
    });

    const startTime = Date.now();
    const response = await handler(request);
    const durationMs = Date.now() - startTime;

    logger.info(`Cron job completed: ${jobName}`, {
      job: jobName,
      durationMs,
      status: response.status,
    });

    return response;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}
