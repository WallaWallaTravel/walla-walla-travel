/**
 * Partner Response API
 *
 * GET  /api/partner-respond/[token] — Fetch request details (public, token is auth)
 * POST /api/partner-respond/[token] — Submit a partner response
 *
 * No CSRF needed (token-based auth, no session cookies).
 * Rate limited to 5 responses per token per hour via Redis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { partnerRequestService } from '@/lib/services/partner-request.service';
import { AddResponseSchema } from '@/lib/types/partner-request';
import { rateLimit } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/partner-respond/[token]
 * Returns the public-safe view of a partner request.
 * Marks the token as "opened" on first visit.
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  context
) => {
  const { token } = await (context as RouteParams).params;

  if (!token || token.length < 32) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid token', statusCode: 400 } },
      { status: 400 }
    );
  }

  const view = await partnerRequestService.getPublicView(token);

  if (!view) {
    return NextResponse.json(
      { success: false, error: { message: 'Request not found or expired', statusCode: 404 } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: view });
});

/**
 * POST /api/partner-respond/[token]
 * Submit a partner response. Rate limited to 5 per token per hour.
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context
) => {
  const { token } = await (context as RouteParams).params;

  if (!token || token.length < 32) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid token', statusCode: 400 } },
      { status: 400 }
    );
  }

  // Rate limit: 5 responses per token per hour
  const rateLimitResult = await rateLimit.check(
    `partner-respond:${token}`,
    5,
    3600 // 1 hour in seconds
  );

  if (!rateLimitResult.allowed) {
    logger.warn('Partner response rate limited', { token: token.slice(0, 8) });
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Too many responses. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429,
        },
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Validate body
  const body = await request.json();
  const parsed = AddResponseSchema.parse(body);

  // Capture client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;

  const response = await partnerRequestService.addResponse(token, {
    ...parsed,
    response_source: 'web_form',
    responder_ip: ip,
  });

  if (!response) {
    return NextResponse.json(
      { success: false, error: { message: 'Request not found, expired, or revoked', statusCode: 404 } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: response.id,
      action: response.action,
      message: response.message,
    },
  });
});
