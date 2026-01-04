import { logger } from '@/lib/logger';
/**
 * Base Service Class
 *
 * @module lib/services/base.service
 * @description Abstract base class providing common functionality for all service classes.
 * Implements the Service Layer pattern with standardized database operations,
 * transaction support, error handling, and structured logging.
 *
 * @abstract
 * @features
 * - Type-safe database query methods (query, queryOne, queryMany)
 * - Transaction support with automatic rollback on error
 * - Standardized error handling with monitoring integration
 * - Structured logging with service context
 * - Insert/update helpers with automatic timestamp management
 *
 * @example
 * ```typescript
 * import { BaseService } from './base.service';
 *
 * export class MyService extends BaseService {
 *   protected get serviceName() { return 'MyService'; }
 *
 *   async getData(id: number) {
 *     return this.queryOne<MyData>('SELECT * FROM my_table WHERE id = $1', [id]);
 *   }
 *
 *   async createWithTransaction(data: CreateData) {
 *     return this.withTransaction(async (client) => {
 *       const record = await this.insert('my_table', data);
 *       await this.insert('audit_log', { record_id: record.id, action: 'create' });
 *       return record;
 *     });
 *   }
 * }
 * ```
 */

import { query } from '@/lib/db';
import { withTransaction, TransactionCallback } from '@/lib/db/transaction';
import { logError } from '@/lib/monitoring/error-logger';

export abstract class BaseService {
  // Service name for logging
  protected abstract get serviceName(): string;

  // ============================================================================
  // Database Query Methods
  // ============================================================================

  /**
   * Execute a database query with optional generic type
   */
  protected async query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }> {
    try {
      const result = await query(sql, params);
      return result as { rows: T[]; rowCount: number | null };
    } catch (error) {
      this.handleError(error, 'query');
      throw error;
    }
  }

  /**
   * Execute a query and return first row
   */
  protected async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  protected async queryMany<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute a query and return count
   */
  protected async queryCount(sql: string, params?: unknown[]): Promise<number> {
    const result = await this.query<{ count: string }>(sql, params);
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Check if a record exists
   */
  protected async exists(table: string, condition: string, params: unknown[]): Promise<boolean> {
    const sql = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${condition}) as exists`;
    const result = await this.query<{ exists: boolean }>(sql, params);
    return result.rows[0]?.exists === true;
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  /**
   * Execute operations in a transaction
   */
  protected async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    try {
      return await withTransaction(callback);
    } catch (error) {
      this.handleError(error, 'transaction');
      throw error;
    }
  }

  // ============================================================================
  // CRUD Helper Methods
  // ============================================================================

  /**
   * Find record by ID
   */
  protected async findById<T = unknown>(
    table: string,
    id: number | string,
    columns: string = '*'
  ): Promise<T | null> {
    const sql = `SELECT ${columns} FROM ${table} WHERE id = $1`;
    return this.queryOne<T>(sql, [id]);
  }

  /**
   * Find records by condition
   */
  protected async findWhere<T = unknown>(
    table: string,
    condition: string,
    params: unknown[],
    columns: string = '*',
    orderBy?: string,
    limit?: number
  ): Promise<T[]> {
    let sql = `SELECT ${columns} FROM ${table} WHERE ${condition}`;

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    return this.queryMany<T>(sql, params);
  }

  /**
   * Insert a record
   */
  protected async insert<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    returning: string = '*'
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const sql = `
      INSERT INTO ${table} (${columns})
      VALUES (${placeholders})
      RETURNING ${returning}
    `;

    const result = await this.query<T>(sql, values);
    return result.rows[0];
  }

  /**
   * Update a record
   */
  protected async update<T = unknown>(
    table: string,
    id: number | string,
    data: Record<string, unknown>,
    returning: string = '*'
  ): Promise<T | null> {
    const updates = { ...data };
    delete updates.id; // Don't allow updating ID

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const sql = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING ${returning}
    `;

    const result = await this.query<T>(sql, [...values, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record
   */
  protected async delete(
    table: string,
    id: number | string
  ): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = $1`;
    const result = await this.query(sql, [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Soft delete (set deleted_at)
   */
  protected async softDelete(
    table: string,
    id: number | string
  ): Promise<boolean> {
    const sql = `
      UPDATE ${table}
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await this.query(sql, [id]);
    return (result.rowCount || 0) > 0;
  }

  // ============================================================================
  // Pagination Helpers
  // ============================================================================

  /**
   * Paginate query results
   */
  protected async paginate<T = unknown>(
    baseQuery: string,
    params: unknown[],
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    data: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM (${baseQuery}) as subquery`;
    const total = await this.queryCount(countQuery, params);

    // Get paginated data
    const dataQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const data = await this.queryMany<T>(dataQuery, [...params, limit, offset]);

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Handle and log service errors
   */
  protected handleError(error: unknown, context: string): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logError({
      errorType: `${this.serviceName}:${context}`,
      errorMessage: errorObj.message,
      stackTrace: errorObj.stack,
      metadata: {
        service: this.serviceName,
        context,
        timestamp: new Date().toISOString(),
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error(`${this.serviceName} Error [${context}]`, { error: errorObj });
    }
  }

  // ============================================================================
  // Logging Helpers
  // ============================================================================

  /**
   * Log service activity
   */
  protected log(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`${this.serviceName}: ${message}`, data);
    }
  }

  /**
   * Log warning
   */
  protected warn(message: string, data?: Record<string, unknown>): void {
    logger.warn(`${this.serviceName}: ${message}`, data);
  }
}




