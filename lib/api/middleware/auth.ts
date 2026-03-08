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
import { auth } from '@/auth';

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
// requireAuth - Get and validate session via Auth.js
// ============================================================================

export async function requireAuth(_request?: NextRequest): Promise<AuthenticatedSession> {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return {
    user: {
      id: parseInt(session.user.id),
      email: session.user.email ?? '',
      name: session.user.name ?? '',
      role: (session.user.role || 'driver') as AuthenticatedSession['user']['role'],
    },
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
