import { logger } from '@/lib/logger';
/**
 * Base Service Class
 * 
 * Provides common functionality for all service classes:
 * - Database query methods
 * - Transaction support
 * - Error handling
 * - Logging
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
  protected async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
    try {
      const result = await query(sql, params);
      return result as { rows: T[]; rowCount: number | null };
    } catch (error: any) {
      this.handleError(error, 'query');
      throw error;
    }
  }

  /**
   * Execute a query and return first row
   */
  protected async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  protected async queryMany<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * Execute a query and return count
   */
  protected async queryCount(sql: string, params?: any[]): Promise<number> {
    const result = await this.query(sql, params);
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Check if a record exists
   */
  protected async exists(table: string, condition: string, params: any[]): Promise<boolean> {
    const sql = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${condition}) as exists`;
    const result = await this.query(sql, params);
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
    } catch (error: any) {
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
  protected async findById<T = any>(
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
  protected async findWhere<T = any>(
    table: string,
    condition: string,
    params: any[],
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
  protected async insert<T = any>(
    table: string,
    data: Record<string, any>,
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

    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * Update a record
   */
  protected async update<T = any>(
    table: string,
    id: number | string,
    data: Record<string, any>,
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

    const result = await this.query(sql, [...values, id]);
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
  protected async paginate<T = any>(
    baseQuery: string,
    params: any[],
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
  protected handleError(error: any, context: string): void {
    logError({
      errorType: `${this.serviceName}:${context}`,
      errorMessage: error?.message || String(error),
      stackTrace: error?.stack,
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

  // ============================================================================
  // Logging Helpers
  // ============================================================================

  /**
   * Log service activity
   */
  protected log(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`📋 ${this.serviceName}: ${message}`, data || '');
    }
  }

  /**
   * Log warning
   */
  protected warn(message: string, data?: any): void {
    logger.warn(`⚠️  ${this.serviceName}: ${message}`, data || '');
  }
}




