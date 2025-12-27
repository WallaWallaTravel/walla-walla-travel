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
import { withErrorHandling, UnauthorizedError, ForbiddenError, ApiHandler } from './error-handler';
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
// Authenticated Handler Types
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthenticatedHandler = (
  request: NextRequest,
  session: AuthSession,
  context?: any
) => Promise<NextResponse<any>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptionalAuthHandler = (
  request: NextRequest,
  session: AuthSession | null,
  context?: any
) => Promise<NextResponse<any>>;

// Error response type (matches error-handler)
interface ErrorResponse {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context?: any) => Promise<NextResponse<any>> {
  return withErrorHandling(async (request: NextRequest, context?: any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAdminAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context?: any) => Promise<NextResponse<any>> {
  return withAuth(async (request: NextRequest, session: AuthSession, context?: any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withDriverAuth(
  handler: AuthenticatedHandler
): (request: NextRequest, context?: any) => Promise<NextResponse<any>> {
  return withAuth(async (request: NextRequest, session: AuthSession, context?: any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withOptionalAuth(
  handler: OptionalAuthHandler
): (request: NextRequest, context?: any) => Promise<NextResponse<any>> {
  return withErrorHandling(async (request: NextRequest, context?: any) => {
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
    } catch (error) {
      // Silently fail - auth is optional
      console.debug('Optional auth failed:', error);
    }

    // Execute handler with session (may be null)
    return await handler(request, session, context);
  });
}

// ============================================================================
// withRoleAuth - Generic Role-Based Authentication
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRoleAuth(
  allowedRoles: Array<'admin' | 'driver' | 'customer' | 'business'>,
  handler: AuthenticatedHandler
): (request: NextRequest, context?: any) => Promise<NextResponse<any>> {
  return withAuth(async (request: NextRequest, session: AuthSession, context?: any) => {
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

async function getSessionFromRequest(): Promise<any> {
  try {
    // First try lib/auth/session.ts format (used by middleware)
    const { getSession: getAuthSession } = await import('@/lib/auth/session');
    const authSession = await getAuthSession();
    if (authSession?.user?.id) {
      // Transform to expected format
      return {
        userId: String(authSession.user.id),
        email: authSession.user.email,
        role: authSession.user.role,
        isLoggedIn: true,
      };
    }
    
    // Fallback to lib/session.ts format
    const { getSession } = await import('@/lib/session');
    return await getSession();
  } catch (error) {
    console.error('[Auth Wrapper] Session error:', error);
    return null;
  }
}

// ============================================================================
// Re-export error classes for convenience
// ============================================================================

export { UnauthorizedError, ForbiddenError } from './error-handler';




