/**
 * Authentication Middleware Functions
 *
 * Provides standalone auth functions for API routes:
 * - requireAuth: Validates session and returns it
 * - requireAdmin: Validates admin role
 * - requireDriver: Validates driver role
 */

import { NextRequest } from 'next/server';
import { UnauthorizedError, ForbiddenError } from './error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedSession {
  user: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'geology_admin' | 'driver' | 'partner' | 'organizer';
  };
  isLoggedIn: boolean;
}

// ============================================================================
// requireAuth - Get and validate session
// ============================================================================

export async function requireAuth(request: NextRequest): Promise<AuthenticatedSession> {
  const session = await getSessionFromRequest(request);

  if (!session || !session.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return {
    user: session.user,
    isLoggedIn: true,
  };
}

// ============================================================================
// requireAdmin - Validate admin role
// ============================================================================

export async function requireAdmin(session: AuthenticatedSession): Promise<void> {
  if (session.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
}

// ============================================================================
// requireDriver - Validate driver role
// ============================================================================

export async function requireDriver(session: AuthenticatedSession): Promise<void> {
  if (session.user.role !== 'driver' && session.user.role !== 'admin') {
    throw new ForbiddenError('Driver access required');
  }
}

// ============================================================================
// requireAdminOrDriver - Validate admin or driver role
// ============================================================================

export async function requireAdminOrDriver(session: AuthenticatedSession): Promise<void> {
  if (session.user.role !== 'admin' && session.user.role !== 'driver') {
    throw new ForbiddenError('Admin or driver access required');
  }
}
