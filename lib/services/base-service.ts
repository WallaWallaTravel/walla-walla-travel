/**
 * Base Service Class
 * All business logic services extend this class
 * Provides common functionality: logging, error handling, transactions
 * 
 * ⚠️ DEPRECATED: New services should use base.service.ts instead
 * This file is kept for backwards compatibility with existing services
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { ServiceError } from '@/lib/api/middleware/error-handler';

// Re-export ServiceError for centralized error handling
export { ServiceError };

export interface ServiceOptions {
  userId?: number;
  transactionId?: string;
}

// ============================================================================
// Service Errors (kept for backwards compatibility)
// New code should import from @/lib/api/middleware/error-handler
// ============================================================================

export class NotFoundError extends Error {
  public code = 'NOT_FOUND';
  constructor(resource: string, identifier?: string) {
    super(identifier ? `${resource} '${identifier}' not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public code = 'VALIDATION_ERROR';
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  public code = 'CONFLICT';
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

// ============================================================================
// Base Service
// ============================================================================

export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // ==========================================================================
  // Logging
  // ==========================================================================

  protected log(level: 'info' | 'warn' | 'error', message: string, context?: any) {
    logger[level]({
      service: this.serviceName,
      ...context,
    }, message);
  }

  protected logInfo(message: string, context?: any) {
    this.log('info', message, context);
  }

  protected logError(error: Error, context?: any) {
    this.log('error', error.message, {
      ...context,
      error: error.stack,
    });
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  protected async query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    try {
      this.logInfo('Executing query', {
        sql: sql.substring(0, 100),
        paramsCount: params?.length || 0,
      });

      const result = await query(sql, params) as { rows: T[]; rowCount: number | null };
      
      this.logInfo('Query executed successfully', {
        rowCount: result.rows.length,
      });

      return result;
    } catch (error) {
      this.logError(error as Error, {
        sql: sql.substring(0, 100),
        params,
      });

      throw new ServiceError(
        'DATABASE_ERROR',
        'Database operation failed',
        { originalError: (error as Error).message }
      );
    }
  }

  /**
   * Execute operations within a transaction
   */
  protected async transaction<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    this.logInfo('Starting transaction');

    try {
      await query('BEGIN');
      const result = await callback();
      await query('COMMIT');

      this.logInfo('Transaction committed successfully');
      return result;
    } catch (error) {
      this.logError(error as Error, { operation: 'transaction' });
      await query('ROLLBACK');
      this.logInfo('Transaction rolled back');
      throw error;
    }
  }

  // ==========================================================================
  // CRUD Helpers
  // ==========================================================================

  /**
   * Find a single record by ID
   */
  protected async findById<T>(
    table: string,
    id: number | string,
    options?: { select?: string[]; include?: string[] }
  ): Promise<T | null> {
    const select = options?.select?.join(', ') || '*';
    const sql = `SELECT ${select} FROM ${table} WHERE id = $1`;

    const result = await this.query<T>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Find records by condition
   */
  protected async findMany<T>(
    table: string,
    where: Record<string, any>,
    options?: {
      select?: string[];
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    const select = options?.select?.join(', ') || '*';
    
    // Build WHERE clause
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.length > 0
      ? 'WHERE ' + whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')
      : '';
    
    const whereValues = Object.values(where);

    // Build ORDER BY
    const orderBy = options?.orderBy ? `ORDER BY ${options.orderBy}` : '';

    // Build LIMIT/OFFSET
    const limitOffset = [];
    if (options?.limit) limitOffset.push(`LIMIT ${options.limit}`);
    if (options?.offset) limitOffset.push(`OFFSET ${options.offset}`);

    const sql = `
      SELECT ${select}
      FROM ${table}
      ${whereClause}
      ${orderBy}
      ${limitOffset.join(' ')}
    `.trim();

    const result = await this.query<T>(sql, whereValues);
    return result.rows;
  }

  /**
   * Create a record
   */
  protected async create<T>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query<T>(sql, values);
    return result.rows[0];
  }

  /**
   * Update a record
   */
  protected async update<T>(
    table: string,
    id: number | string,
    data: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const sql = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    const result = await this.query<T>(sql, [...values, id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
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
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Check if record exists
   */
  protected async exists(
    table: string,
    where: Record<string, any>
  ): Promise<boolean> {
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    const whereValues = Object.values(where);

    const sql = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause}) as exists`;
    const result = await this.query<{ exists: boolean }>(sql, whereValues);

    return result.rows[0].exists;
  }

  /**
   * Count records
   */
  protected async count(
    table: string,
    where?: Record<string, any>
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const whereValues: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereKeys = Object.keys(where);
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      whereValues.push(...Object.values(where));
    }

    const result = await this.query<{ count: string }>(sql, whereValues);
    return parseInt(result.rows[0].count, 10);
  }

  // ==========================================================================
  // Validation Helpers
  // ==========================================================================

  /**
   * Require a value to be present (throws if not)
   */
  protected require<T>(
    value: T | null | undefined,
    errorMessage: string
  ): T {
    if (value === null || value === undefined) {
      throw new ValidationError(errorMessage);
    }
    return value;
  }

  /**
   * Validate that a record exists
   */
  protected async requireExists(
    table: string,
    id: number | string,
    resourceName: string
  ): Promise<void> {
    const exists = await this.exists(table, { id });
    if (!exists) {
      throw new NotFoundError(resourceName, String(id));
    }
  }
}


