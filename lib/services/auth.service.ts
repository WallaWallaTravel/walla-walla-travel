import { logger } from '@/lib/logger';
/**
 * Authentication Service
 *
 * @module lib/services/auth.service
 * @description Handles user authentication, session management, and access control.
 * Provides secure login with bcrypt password verification and JWT session tokens.
 *
 * @security
 * - Passwords are verified using bcrypt (never stored in plain text)
 * - Login attempts are rate-limited (5 attempts per 15 minutes)
 * - Sessions are JWT tokens with configurable expiration
 * - Inactive users cannot authenticate
 *
 * @example
 * ```typescript
 * import { authService } from '@/lib/services/auth.service';
 *
 * // Authenticate user
 * const result = await authService.login({
 *   email: 'admin@example.com',
 *   password: 'securePassword123'
 * }, '192.168.1.1');
 *
 * // Returns { token, user, redirectTo }
 * ```
 */

import { BaseService } from './base.service';
import { verifyPassword } from '@/lib/auth/passwords';
import { createSession, SessionUser } from '@/lib/auth/session';
import { UnauthorizedError, ForbiddenError } from '@/lib/api/middleware/error-handler';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'driver';
  };
  redirectTo: string;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'driver';
  is_active: boolean;
}

export class AuthService extends BaseService {
  protected get serviceName(): string {
    return 'AuthService';
  }

  /**
   * Authenticate user and create session
   */
  async login(credentials: LoginCredentials, ip?: string): Promise<LoginResult> {
    this.log('Login attempt', { email: credentials.email });

    // Find user by email
    const user = await this.queryOne<UserRow>(
      `SELECT id, email, name, password_hash, role, is_active 
       FROM users 
       WHERE email = $1`,
      [credentials.email.toLowerCase()]
    );

    if (!user) {
      this.log('Login failed - user not found', { email: credentials.email });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      this.log('Login failed - account disabled', { userId: user.id });
      throw new ForbiddenError('Account is disabled');
    }

    // Verify password
    const isValid = await verifyPassword(credentials.password, user.password_hash);
    if (!isValid) {
      this.log('Login failed - invalid password', { userId: user.id });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create session
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createSession(sessionUser);

    // Log successful login (non-blocking)
    this.logActivity(user.id, 'login', { ip: ip || 'unknown' }).catch((err) => {
      logger.error('[AuthService] Failed to log activity:', err);
    });

    this.log('Login successful', { userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectTo: this.getRedirectUrl(user.role),
    };
  }

  /**
   * Get redirect URL based on user role
   */
  private getRedirectUrl(role: string): string {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'geology_admin':
        return '/admin/geology';
      case 'driver':
        return '/driver-portal/dashboard';
      case 'partner':
        return '/partner-portal/dashboard';
      default:
        return '/';
    }
  }

  /**
   * Log user activity (non-critical, non-blocking)
   */
  private async logActivity(userId: number, action: string, details: Record<string, unknown>): Promise<void> {
    const { query } = await import('@/lib/db');
    await query(
      `INSERT INTO user_activity_logs (user_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, action, JSON.stringify(details)]
    );
  }

  /**
   * Get user by ID (for session validation)
   */
  async getUserById(id: number): Promise<SessionUser | null> {
    const user = await this.queryOne<UserRow>(
      `SELECT id, email, name, role, is_active 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (!user || !user.is_active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<SessionUser | null> {
    const user = await this.queryOne<UserRow>(
      `SELECT id, email, name, role, is_active 
       FROM users 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!user || !user.is_active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();




