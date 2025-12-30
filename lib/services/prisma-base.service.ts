import { logger } from '@/lib/logger';
/**
 * Prisma Base Service Class
 *
 * Provides common functionality for all Prisma-based service classes:
 * - Type-safe database operations via Prisma
 * - Transaction support with isolation levels
 * - Error handling with structured logging
 * - Audit logging for sensitive operations
 *
 * This replaces the raw SQL BaseService for type-safe, maintainable code.
 */

import { prisma, PrismaClient, Prisma } from '@/lib/prisma';
import { logError } from '@/lib/monitoring/error-logger';

// Transaction isolation levels for financial operations
export type IsolationLevel = Prisma.TransactionIsolationLevel;

// Common pagination response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

// Audit log entry for financial operations
export interface AuditLogEntry {
  actionType: string;
  entityType: string;
  entityId: string | number;
  userId?: number;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export abstract class PrismaBaseService {
  // Service name for logging
  protected abstract get serviceName(): string;

  // The Prisma client instance
  protected get db(): PrismaClient {
    return prisma;
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  /**
   * Execute operations in a transaction with optional isolation level
   *
   * For financial operations, use 'Serializable' isolation:
   * await this.withTransaction(async (tx) => {
   *   // payment logic
   * }, 'Serializable');
   */
  protected async withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    isolationLevel?: IsolationLevel
  ): Promise<T> {
    try {
      const options = isolationLevel
        ? { isolationLevel }
        : undefined;

      return await prisma.$transaction(callback, options);
    } catch (error: unknown) {
      this.handleError(error, 'transaction');
      throw error;
    }
  }

  /**
   * Execute multiple operations in a batch transaction
   */
  protected async batchTransaction<T>(
    operations: Prisma.PrismaPromise<T>[]
  ): Promise<T[]> {
    try {
      return await prisma.$transaction(operations);
    } catch (error: unknown) {
      this.handleError(error, 'batchTransaction');
      throw error;
    }
  }

  // ============================================================================
  // Pagination Helpers
  // ============================================================================

  /**
   * Create paginated response from count and data
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    options: PaginationOptions
  ): PaginatedResponse<T> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Calculate skip and take for Prisma pagination
   */
  protected getPaginationParams(options: PaginationOptions): { skip: number; take: number } {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;

    return {
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
  }

  // ============================================================================
  // Audit Logging (for financial/sensitive operations)
  // ============================================================================

  /**
   * Log a financial/sensitive operation to the audit trail
   */
  protected async auditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.financial_audit_log.create({
        data: {
          action_type: entry.actionType,
          entity_type: entry.entityType,
          entity_id: String(entry.entityId),
          user_id: entry.userId,
          previous_state: entry.previousState as Prisma.InputJsonValue,
          new_state: entry.newState as Prisma.InputJsonValue,
          metadata: entry.metadata as Prisma.InputJsonValue,
          success: true,
        },
      });
    } catch (error) {
      // Don't fail the operation if audit logging fails, but log the error
      logger.error('[AuditLog] Failed to create audit entry:', error);
    }
  }

  /**
   * Log a failed operation to the audit trail
   */
  protected async auditLogFailure(
    entry: AuditLogEntry,
    errorMessage: string
  ): Promise<void> {
    try {
      await prisma.financial_audit_log.create({
        data: {
          action_type: entry.actionType,
          entity_type: entry.entityType,
          entity_id: String(entry.entityId),
          user_id: entry.userId,
          previous_state: entry.previousState as Prisma.InputJsonValue,
          new_state: entry.newState as Prisma.InputJsonValue,
          metadata: entry.metadata as Prisma.InputJsonValue,
          success: false,
          error_message: errorMessage,
        },
      });
    } catch (error) {
      logger.error('[AuditLog] Failed to create failure audit entry:', error);
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Handle and log service errors with context
   */
  protected handleError(error: unknown, context: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logError({
      errorType: `${this.serviceName}:${context}`,
      errorMessage,
      stackTrace: errorStack,
      metadata: {
        service: this.serviceName,
        context,
        timestamp: new Date().toISOString(),
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error(`❌ ${this.serviceName} Error [${context}]:`, error);
    }
  }

  /**
   * Handle Prisma-specific errors with better messages
   */
  protected handlePrismaError(error: unknown, context: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma error codes
      switch (error.code) {
        case 'P2002':
          // Unique constraint violation
          const field = (error.meta?.target as string[])?.join(', ') || 'unknown';
          throw new Error(`Duplicate entry: ${field} already exists`);

        case 'P2003':
          // Foreign key constraint violation
          throw new Error(`Invalid reference: Related record not found`);

        case 'P2025':
          // Record not found
          throw new Error(`Record not found`);

        case 'P2014':
          // Required relation violation
          throw new Error(`Required relation violated`);

        default:
          this.handleError(error, context);
          throw error;
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new Error(`Validation error: ${error.message}`);
    }

    this.handleError(error, context);
    throw error;
  }

  // ============================================================================
  // Logging Helpers
  // ============================================================================

  /**
   * Log service activity (development only)
   */
  protected log(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`📋 ${this.serviceName}: ${message}`, data || '');
    }
  }

  /**
   * Log warning
   */
  protected warn(message: string, data?: unknown): void {
    logger.warn(`⚠️  ${this.serviceName}: ${message}`, data || '');
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate a unique reference number (e.g., for bookings, invoices)
   */
  protected generateReferenceNumber(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Check if a value is a valid ID (number or UUID string)
   */
  protected isValidId(id: unknown): id is number | string {
    if (typeof id === 'number') return Number.isInteger(id) && id > 0;
    if (typeof id === 'string') {
      // Check for UUID format or numeric string
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        || /^\d+$/.test(id);
    }
    return false;
  }

  /**
   * Safely parse an ID to number
   */
  protected parseId(id: string | number): number {
    const parsed = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`Invalid ID: ${id}`);
    }
    return parsed;
  }
}
