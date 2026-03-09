/**
 * Get Current User API
 * GET /api/auth/me
 *
 * Returns current authenticated user or 401
 *
 * ✅ REFACTORED: Structured logging + withErrorHandling middleware
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const session = await getSession();

  if (!session?.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  });
});

