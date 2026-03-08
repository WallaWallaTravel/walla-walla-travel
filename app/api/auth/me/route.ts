/**
 * Get Current User API
 * GET /api/auth/me
 *
 * Returns current authenticated user or 401
 *
 * ✅ REFACTORED: Structured logging + withErrorHandling middleware
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  return NextResponse.json({
    user: {
      id: parseInt(session.user.id),
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  });
});

