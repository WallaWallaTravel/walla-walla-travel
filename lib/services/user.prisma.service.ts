import { logger } from '@/lib/logger';
/**
 * User Prisma Service
 *
 * Type-safe user management using Prisma ORM.
 * Replaces the raw SQL user.service.ts for maintainable, type-safe operations.
 */

import { PrismaBaseService, PaginationOptions } from './prisma-base.service';
import { prisma, Prisma, users } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/passwords';
import { ConflictError, NotFoundError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Types
// ============================================================================

// Safe user select - excludes password_hash and returns only essential fields
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  is_active: true,
  last_login: true,
  created_at: true,
  updated_at: true,
  emergency_contact_name: true,
  emergency_contact_phone: true,
  emergency_contact_relationship: true,
  tenant_id: true,
  accessible_tenant_ids: true,
} as const satisfies Prisma.usersSelect;

// User type inferred from the select - ensures type safety
export type User = Prisma.usersGetPayload<{ select: typeof safeUserSelect }>;
export type UserWithPassword = users;

export type UserRole = 'admin' | 'driver';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  tenantId?: number;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  phone?: string;
  role?: UserRole;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

export interface UserListFilters extends PaginationOptions {
  role?: UserRole;
  isActive?: boolean;
  tenantId?: number;
  search?: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

class UserPrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'UserService';
  }

  // Use the module-level safeUserSelect for type consistency
  private readonly safeSelect = safeUserSelect;

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    this.log('Creating user', { email: input.email, role: input.role });

    // Check if email already exists (case-insensitive)
    const existing = await this.db.users.findFirst({
      where: {
        email: {
          equals: input.email,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictError('Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user = await this.db.users.create({
      data: {
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        name: input.name,
        role: input.role,
        phone: input.phone || null,
        emergency_contact_name: input.emergencyContactName || null,
        emergency_contact_phone: input.emergencyContactPhone || null,
        emergency_contact_relationship: input.emergencyContactRelationship || null,
        tenant_id: input.tenantId || null,
        is_active: true,
      },
      select: this.safeSelect,
    });

    this.log(`User created: ${user.id}`, { role: user.role });

    // Audit log
    await this.auditLog({
      actionType: 'USER_CREATED',
      entityType: 'user',
      entityId: user.id,
      newState: { email: user.email, role: user.role },
    });

    return user;
  }

  /**
   * Get user by ID (without password)
   */
  async getById(id: number): Promise<User | null> {
    return this.db.users.findUnique({
      where: { id },
      select: this.safeSelect,
    });
  }

  /**
   * Get user by email (without password) - for display purposes
   */
  async getByEmailSafe(email: string): Promise<User | null> {
    return this.db.users.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        is_active: true,
      },
      select: this.safeSelect,
    });
  }

  /**
   * Get user by email WITH password hash (for authentication only)
   */
  async getByEmailForAuth(email: string): Promise<UserWithPassword | null> {
    return this.db.users.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        is_active: true,
      },
    });
  }

  /**
   * Update user
   */
  async update(id: number, input: UpdateUserInput): Promise<User> {
    this.log(`Updating user ${id}`, input);

    // Check user exists
    const existing = await this.db.users.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User', id.toString());
    }

    // If email is being changed, check for conflicts
    if (input.email && input.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailExists = await this.db.users.findFirst({
        where: {
          email: {
            equals: input.email,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (emailExists) {
        throw new ConflictError('Email already exists');
      }
    }

    const updated = await this.db.users.update({
      where: { id },
      data: {
        email: input.email?.toLowerCase(),
        name: input.name,
        phone: input.phone,
        role: input.role,
        emergency_contact_name: input.emergencyContactName,
        emergency_contact_phone: input.emergencyContactPhone,
        emergency_contact_relationship: input.emergencyContactRelationship,
        updated_at: new Date(),
      },
      select: this.safeSelect,
    });

    return updated;
  }

  /**
   * Update user password
   */
  async updatePassword(id: number, newPassword: string): Promise<void> {
    const user = await this.db.users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User', id.toString());
    }

    const passwordHash = await hashPassword(newPassword);

    await this.db.users.update({
      where: { id },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    });

    // Audit log for password change
    await this.auditLog({
      actionType: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: id,
      metadata: { changedAt: new Date().toISOString() },
    });

    this.log(`Password updated for user ${id}`);
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Deactivate user
   */
  async deactivate(id: number): Promise<User> {
    this.log(`Deactivating user ${id}`);

    const user = await this.db.users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User', id.toString());
    }

    const updated = await this.db.users.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
      select: this.safeSelect,
    });

    await this.auditLog({
      actionType: 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: id,
    });

    return updated;
  }

  /**
   * Activate user
   */
  async activate(id: number): Promise<User> {
    this.log(`Activating user ${id}`);

    const user = await this.db.users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User', id.toString());
    }

    const updated = await this.db.users.update({
      where: { id },
      data: {
        is_active: true,
        updated_at: new Date(),
      },
      select: this.safeSelect,
    });

    await this.auditLog({
      actionType: 'USER_ACTIVATED',
      entityType: 'user',
      entityId: id,
    });

    return updated;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    try {
      await this.db.users.update({
        where: { id: userId },
        data: { last_login: new Date() },
      });
    } catch (error) {
      // Don't throw - this is not critical
      this.warn(`Failed to update last login for user ${userId}`);
    }
  }

  // ============================================================================
  // List and Search
  // ============================================================================

  /**
   * List users with filters and pagination
   */
  async list(filters?: UserListFilters) {
    const where: Prisma.usersWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.is_active = filters.isActive;
    }

    if (filters?.tenantId) {
      where.tenant_id = filters.tenantId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const { skip, take } = this.getPaginationParams(filters || {});

    const [data, total] = await Promise.all([
      this.db.users.findMany({
        where,
        select: this.safeSelect,
        orderBy: filters?.orderBy || { name: 'asc' },
        skip,
        take,
      }),
      this.db.users.count({ where }),
    ]);

    return this.createPaginatedResponse(data, total, filters || {});
  }

  /**
   * Get all active drivers
   */
  async getActiveDrivers(): Promise<User[]> {
    return this.db.users.findMany({
      where: {
        role: 'driver',
        is_active: true,
      },
      select: this.safeSelect,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all admins
   */
  async getAdmins(): Promise<User[]> {
    return this.db.users.findMany({
      where: {
        role: 'admin',
        is_active: true,
      },
      select: this.safeSelect,
      orderBy: { name: 'asc' },
    });
  }

  // ============================================================================
  // Stats and Counts
  // ============================================================================

  /**
   * Get user counts by role
   */
  async getCountsByRole(): Promise<Record<string, number>> {
    const results = await this.db.users.groupBy({
      by: ['role'],
      where: { is_active: true },
      _count: { id: true },
    });

    return results.reduce(
      (acc, r) => {
        acc[r.role] = r._count.id;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Check if user exists by email
   */
  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    const user = await this.db.users.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });

    return !!user;
  }
}

// Export singleton instance
export const userPrismaService = new UserPrismaService();
