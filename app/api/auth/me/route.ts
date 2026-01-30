/**
 * Get Current User API
 * GET /api/auth/me
 *
 * Returns current authenticated user or 401
 *
 * ✅ REFACTORED: Structured logging + withErrorHandling middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }

  return NextResponse.json({
    user: session.user,
  });
});

