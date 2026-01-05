import { logger } from '@/lib/logger';
/**
 * Authentication Middleware Wrappers
 * 
 * Provides type-safe authentication wrappers for API routes:
 * - withAuth: Requires authentication
 * - withAdminAuth: Requires admin role
 * - withDriverAuth: Requires driver role
 * - withOptionalAuth: Optional authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, ForbiddenError } from './error-handler';
import { requireAdmin as checkAdminRole } from '@/lib/admin-auth';

// Note: getSessionFromRequest is defined locally at bottom of file to handle
// multiple session formats (lib/auth/session.ts and lib/session.ts)

// ============================================================================
// Session Type
// ============================================================================

export interface AuthSession {
  userId: string;
  email: string;
  role: 'admin' | 'driver' | 'customer' | 'business';
  brandId?: number;
}

// ============================================================================
// Route Context Type (Next.js App Router dynamic route params)
// Next.js 15+ wraps params in Promise
// ============================================================================

export interface RouteContext<P = Record<string, string>> {
  params: Promise<P>;
}

// ============================================================================
// Authenticated Handler Types
// ============================================================================


export type AuthenticatedHandler = (
  request: NextRequest,
  session: AuthSession,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: RouteContext | { params: Promise<any> }
) => Promise<NextResponse<unknown>>;

export type OptionalAuthHandler = (
  request: NextRequest,
  session: AuthSession | null,
  context?: RouteContext
) => Promise<NextResponse<unknown>>;

// Error response type (matches error-handler)
interface _ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    errors?: Record<string, string[]>;
  };
}

// ============================================================================
// withAuth - Requires Authentication
// ============================================================================


export function withAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<unknown>> {
  return withErrorHandling(async (request: NextRequest, context: RouteContext) => {
    // Get session from request
    const session = await getSessionFromRequest();

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if session is valid
    if (!session.userId || !session.email) {
      throw new UnauthorizedError('Invalid session');
    }

    // Create typed session object
    const authSession: AuthSession = {
      userId: session.userId,
      email: session.email,
      role: session.role || 'customer',
      brandId: session.brandId,
    };

    // Execute handler with session
    return await handler(request, authSession, context);
  });
}

// ============================================================================
// withAdminAuth - Requires Admin Role
// ============================================================================


export function withAdminAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<unknown>> {
  return withAuth(async (request: NextRequest, session: AuthSession, context?: RouteContext) => {
    // Check admin role
    if (session.role !== 'admin') {
      // Double-check with admin auth service
      const adminCheck = await checkAdminRole();
      if ('status' in adminCheck) {
        throw new ForbiddenError('Admin access required');
      }
    }

    // Execute handler with verified admin session
    return await handler(request, session, context);
  });
}

// ============================================================================
// withDriverAuth - Requires Driver Role
// ============================================================================


export function withDriverAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<unknown>> {
  return withAuth(async (request: NextRequest, session: AuthSession, context?: RouteContext) => {
    // Check driver role
    if (session.role !== 'driver' && session.role !== 'admin') {
      throw new ForbiddenError('Driver access required');
    }

    // Execute handler with verified driver session
    return await handler(request, session, context);
  });
}

// ============================================================================
// withOptionalAuth - Optional Authentication
// ============================================================================


export function withOptionalAuth(
  handler: OptionalAuthHandler
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<unknown>> {
  return withErrorHandling(async (request: NextRequest, context: RouteContext) => {
    // Try to get session (don't throw if it fails)
    let session: AuthSession | null = null;

    try {
      const rawSession = await getSessionFromRequest();
      if (rawSession && rawSession.userId) {
        session = {
          userId: rawSession.userId,
          email: rawSession.email || '',
          role: rawSession.role || 'customer',
          brandId: rawSession.brandId,
        };
      }
    } catch (error: unknown) {
      // Silently fail - auth is optional
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.debug('Optional auth failed', { error: errorMessage });
    }

    // Execute handler with session (may be null)
    return await handler(request, session, context);
  });
}

// ============================================================================
// withRoleAuth - Generic Role-Based Authentication
// ============================================================================


export function withRoleAuth(
  allowedRoles: Array<'admin' | 'driver' | 'customer' | 'business'>,
  handler: AuthenticatedHandler
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<unknown>> {
  return withAuth(async (request: NextRequest, session: AuthSession, context?: RouteContext) => {
    // Check if user has required role
    if (!allowedRoles.includes(session.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    // Execute handler with verified session
    return await handler(request, session, context);
  });
}

// ============================================================================
// Helper: Get session from request (no throw)
// ============================================================================

/**
 * Internal session format returned by getSessionFromRequest
 * Combines fields from both session sources
 */
interface InternalSession {
  userId: string;
  email: string;
  role: 'admin' | 'driver' | 'customer' | 'business';
  brandId?: number;
  isLoggedIn?: boolean;
}

async function getSessionFromRequest(): Promise<InternalSession | null> {
  try {
    // First try lib/auth/session.ts format (used by middleware)
    const { getSession: getAuthSession } = await import('@/lib/auth/session');
    const authSession = await getAuthSession();
    if (authSession?.user?.id) {
      // Transform to expected format
      return {
        userId: String(authSession.user.id),
        email: authSession.user.email,
        role: authSession.user.role as InternalSession['role'],
        isLoggedIn: true,
      };
    }

    // Fallback to lib/session.ts format
    const { getSession } = await import('@/lib/session');
    const session = await getSession();
    if (session?.userId) {
      return {
        userId: session.userId,
        email: session.email,
        role: (session.role as InternalSession['role']) || 'customer',
        isLoggedIn: session.isLoggedIn,
      };
    }
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Auth Wrapper] Session error', { error: errorMessage });
    return null;
  }
}

// ============================================================================
// Re-export error classes for convenience
// ============================================================================

export { UnauthorizedError, ForbiddenError } from './error-handler';




