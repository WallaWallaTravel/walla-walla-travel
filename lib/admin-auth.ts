/**
 * Admin Authentication Utilities
 * Provides role-based access control for admin/supervisor features
 */

import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { errorResponse } from '@/app/api/utils';
import { logger } from '@/lib/logger';

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'supervisor' | 'driver';
}

/**
 * Check if user has admin or supervisor role
 * Returns session if authorized, error response if not
 */
export async function requireAdmin(): Promise<AdminSession | Response> {
  try {
    // Get session from cookie (same as regular auth)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return errorResponse('Unauthorized - Please log in', 401);
    }

    // Parse session cookie
    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return errorResponse('Invalid session format', 401);
    }

    if (!session.userId) {
      return errorResponse('Invalid session data', 401);
    }

    // Get user details and check role from database
    const userResult = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true',
      [parseInt(session.userId)]
    );

    if (userResult.rows.length === 0) {
      return errorResponse('User not found or inactive', 401);
    }

    const user = userResult.rows[0];

    // Check if user has admin or supervisor role
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      return errorResponse('Access denied - Admin or supervisor role required', 403);
    }

    return {
      userId: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

  } catch (error) {
    logger.error('Admin auth error', { error });
    return errorResponse('Authentication failed', 500);
  }
}

/**
 * Check if user has admin role (not just supervisor)
 * Returns session if authorized, error response if not
 */
export async function requireAdminOnly(): Promise<AdminSession | Response> {
  const authResult = await requireAdmin();

  if ('status' in authResult) {
    return authResult; // Return error response
  }

  if (authResult.role !== 'admin') {
    return errorResponse('Access denied - Admin role required', 403);
  }

  return authResult;
}

/**
 * Get current user's role without requiring admin access
 * Used for conditional UI rendering
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return null;
    }

    // Parse session cookie
    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return null;
    }

    if (!session.userId) {
      return null;
    }

    const userResult = await query(
      'SELECT role FROM users WHERE id = $1 AND is_active = true',
      [parseInt(session.userId)]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    return userResult.rows[0].role;

  } catch (error) {
    logger.error('Error getting user role', { error });
    return null;
  }
}

/**
 * Check if current user is admin or supervisor
 */
export async function isAdminOrSupervisor(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'admin' || role === 'supervisor';
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'admin';
}
