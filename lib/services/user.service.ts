/**
 * User Service
 * 
 * Business logic for user management
 */

import { BaseService } from './base.service';
import { hashPassword } from '@/lib/auth/passwords';
import { ConflictError, NotFoundError } from '@/lib/api/middleware/error-handler';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'driver';
  phone?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'driver';
  phone?: string;
}

export class UserService extends BaseService {
  protected get serviceName(): string {
    return 'UserService';
  }

  /**
   * List users with filters
   */
  async list(filters?: {
    role?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }) {
    this.log('Listing users', filters);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramCount = 0;

    if (filters?.role) {
      paramCount++;
      conditions.push(`role = $${paramCount}`);
      params.push(filters.role);
    }

    if (filters?.is_active !== undefined) {
      paramCount++;
      conditions.push(`is_active = $${paramCount}`);
      params.push(filters.is_active);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const baseQuery = `
      SELECT 
        id, email, name, role, phone, is_active,
        created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY name ASC
    `;

    return this.paginate<User>(
      baseQuery,
      params,
      filters?.limit || 50,
      filters?.offset || 0
    );
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData): Promise<User> {
    this.log('Creating user', { email: data.email, role: data.role });

    // Check if email already exists
    const existing = await this.queryOne(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [data.email]
    );

    if (existing) {
      throw new ConflictError('Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.insert<User>('users', {
      email: data.email.toLowerCase(),
      name: data.name,
      password_hash: passwordHash,
      role: data.role,
      phone: data.phone || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    this.log(`User created: ${user.id}`, { role: user.role });

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    this.log(`Updating user ${id}`, data);

    const updated = await this.update<User>('users', id, {
      ...data,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`User ${id} not found`);
    }

    return updated;
  }

  /**
   * Deactivate user
   */
  async deactivate(id: number): Promise<User> {
    this.log(`Deactivating user ${id}`);

    return this.updateUser(id, { is_active: false });
  }

  /**
   * Activate user
   */
  async activate(id: number): Promise<User> {
    this.log(`Activating user ${id}`);

    return this.updateUser(id, { is_active: true });
  }

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<User | null> {
    return this.queryOne<User>(
      'SELECT id, email, name, role, phone, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
  }

  /**
   * Get user by email (for authentication)
   */
  async getByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    return this.queryOne<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    try {
      await this.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
    } catch (_error) {
      // Don't throw - this is not critical
      this.warn(`Failed to update last login for user ${userId}`);
    }
  }
}

// Export singleton instance
export const userService = new UserService();




