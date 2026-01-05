import { logger } from '@/lib/logger';
/**
 * Authentication Prisma Service
 *
 * Type-safe authentication and session management using Prisma ORM.
 * Replaces the raw SQL auth.service.ts for maintainable, type-safe operations.
 */

import { PrismaBaseService } from './prisma-base.service';
// Prisma and users types available for future use
import { verifyPassword } from '@/lib/auth/passwords';
import { createSession, SessionUser } from '@/lib/auth/session';
import { UnauthorizedError, ForbiddenError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Service Implementation
// ============================================================================

class AuthPrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'AuthService';
  }

  /**
   * Authenticate user and create session
   */
  async login(credentials: LoginCredentials, ip?: string): Promise<LoginResult> {
    this.log('Login attempt', { email: credentials.email });

    // Find user by email (case-insensitive)
    const user = await this.db.users.findFirst({
      where: {
        email: {
          equals: credentials.email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        password_hash: true,
        role: true,
        is_active: true,
      },
    });

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
      role: user.role as 'admin' | 'driver',
    };

    const token = await createSession(sessionUser);

    // Update last login timestamp
    await this.db.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Log activity (non-blocking)
    this.logLoginActivity(user.id, ip).catch((err) => {
      logger.error('[AuthService] Failed to log activity:', err);
    });

    this.log('Login successful', { userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'driver',
      },
      redirectTo: user.role === 'admin' ? '/admin/dashboard' : '/driver-portal/dashboard',
    };
  }

  /**
   * Get user by ID (for session validation)
   */
  async getUserById(id: number): Promise<SessionUser | null> {
    const user = await this.db.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'driver',
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<SessionUser | null> {
    const user = await this.db.users.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'driver',
    };
  }

  /**
   * Log login activity (non-critical, non-blocking)
   */
  private async logLoginActivity(userId: number, ip?: string): Promise<void> {
    try {
      // Check if user_activity_logs table exists and log
      // This is wrapped in try-catch as it's not critical
      await this.db.$executeRaw`
        INSERT INTO user_activity_logs (user_id, action, details, created_at)
        VALUES (${userId}, 'login', ${JSON.stringify({ ip: ip || 'unknown' })}::jsonb, NOW())
      `;
    } catch (error) {
      // Silently fail - activity logging is not critical
      this.warn('Failed to log login activity', { userId, error });
    }
  }

  /**
   * Validate a user exists and is active
   */
  async validateUser(userId: number): Promise<boolean> {
    const user = await this.db.users.findUnique({
      where: { id: userId },
      select: { is_active: true },
    });

    return user?.is_active === true;
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: number, role: 'admin' | 'driver'): Promise<boolean> {
    const user = await this.db.users.findUnique({
      where: { id: userId },
      select: { role: true, is_active: true },
    });

    return user?.is_active === true && user?.role === role;
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: number): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  /**
   * Check if user is driver
   */
  async isDriver(userId: number): Promise<boolean> {
    return this.hasRole(userId, 'driver');
  }
}

// Export singleton instance
export const authPrismaService = new AuthPrismaService();
