import { NextRequest } from 'next/server';
import {
  successResponse,
  requireAuth,
} from '@/app/api/utils';
import { logApiRequest } from '@/lib/logger';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

/**
 * Session verification endpoint
 * ✅ REFACTORED: Structured logging + withErrorHandling middleware
 */
export const GET = withErrorHandling(async () => {
  logApiRequest('GET', '/api/auth/verify');

  // Check if user has valid session
  const authResult = await requireAuth();
  if ('status' in authResult) {
    throw new UnauthorizedError('Session invalid or expired');
  }
  const session = authResult;

  // Session is valid
  return successResponse({
    authenticated: true,
    user: {
      email: session.email,
      userId: session.userId,
      name: session.name,
    }
  }, 'Session is valid');
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Alternative POST endpoint for session verification
  logApiRequest('POST', '/api/auth/verify');

  // Check if user has valid session
  const authResult = await requireAuth();
  if ('status' in authResult) {
    throw new UnauthorizedError('Session invalid or expired');
  }
  const session = authResult;

  // Session is valid
  return successResponse({
    authenticated: true,
    user: {
      email: session.email,
      userId: session.userId,
      name: session.name,
    }
  }, 'Session is valid');
});