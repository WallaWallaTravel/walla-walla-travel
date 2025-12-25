/**
 * Database Connection Module
 * 
 * This module provides the PostgreSQL connection pool and query helper.
 * Business logic has been moved to service classes in lib/services/.
 * 
 * @see lib/services/user.service.ts - User operations
 * @see lib/services/vehicle.service.ts - Vehicle operations
 * @see lib/services/inspection.service.ts - Inspection operations
 * @see lib/services/workflow.service.ts - Workflow operations
 * @see lib/services/booking.service.ts - Booking operations
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logDbError, logDebug } from './logger';
import { getDatabaseConfig } from './config/database';

// Create connection pool with centralized configuration
export const pool = new Pool(getDatabaseConfig());

// Test connection on initialization
pool.on('connect', () => {
  console.log('📊 Connected to Heroku PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

/**
 * Execute a database query with optional generic type support
 * 
 * @example
 * // Simple query
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 * 
 * // With type parameter
 * const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
 * const user = result.rows[0];
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T & QueryResultRow>> {
  const start = Date.now();
  try {
    const res = await pool.query<T & QueryResultRow>(text, params);
    const duration = Date.now() - start;
    
    // Log successful queries in debug mode
    logDebug('Database', `Query executed in ${duration}ms`, {
      sql: text,
      params,
      rows: res.rowCount,
      duration
    });
    
    return res;
  } catch (error: any) {
    // Log database errors with full details
    const errorId = logDbError('Database', text, params || [], error);
    
    // Add errorId to the error object for tracking
    error.errorId = errorId;
    
    throw error;
  }
}

/**
 * Database health check
 * Used by /api/health endpoint to verify database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database health check passed:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

/**
 * Close database connections
 * Call this during application shutdown for clean cleanup
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('📊 Database connection pool closed');
}

export default pool;
