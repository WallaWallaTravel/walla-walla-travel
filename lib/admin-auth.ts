/**
 * Admin Authentication Utilities
 * Provides role-based access control for admin/supervisor features
 */

import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { errorResponse } from '@/app/api/utils';

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
    // Get session token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token');

    if (!token) {
      return errorResponse('Unauthorized - Please log in', 401);
    }

    // Get user from session
    const sessionResult = await query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token.value]
    );

    if (sessionResult.rows.length === 0) {
      return errorResponse('Invalid or expired session', 401);
    }

    const userId = sessionResult.rows[0].user_id;

    // Get user details and check role
    const userResult = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
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
    console.error('❌ Admin auth error:', error);
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
    const token = cookieStore.get('session_token');

    if (!token) {
      return null;
    }

    const sessionResult = await query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token.value]
    );

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const userResult = await query(
      'SELECT role FROM users WHERE id = $1 AND is_active = true',
      [sessionResult.rows[0].user_id]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    return userResult.rows[0].role;

  } catch (error) {
    console.error('❌ Error getting user role:', error);
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
