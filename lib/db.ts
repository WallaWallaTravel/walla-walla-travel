/**
 * Database Connection Module
 *
 * @module lib/db
 * @description Provides PostgreSQL connection pool with:
 * - Query execution with timing
 * - Slow query logging (>1s by default)
 * - Pool health monitoring
 * - Statement timeout enforcement (30s by default)
 *
 * @see lib/services/user.service.ts - User operations
 * @see lib/services/vehicle.service.ts - Vehicle operations
 * @see lib/services/inspection.service.ts - Inspection operations
 * @see lib/services/booking.service.ts - Booking operations
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logDbError, logDebug, logger } from './logger';
import { getDatabaseConfig, isSlowQuery, DB_DEFAULTS } from './config/database';

// Pool statistics for monitoring
interface PoolStats {
  totalQueries: number;
  slowQueries: number;
  errors: number;
  lastError: Date | null;
  avgQueryTimeMs: number;
  queryTimes: number[];
}

const poolStats: PoolStats = {
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  lastError: null,
  avgQueryTimeMs: 0,
  queryTimes: [],
};

// Create connection pool with centralized configuration
export const pool = new Pool(getDatabaseConfig());

// Test connection on initialization
pool.on('connect', () => {
  logDebug('Connected to PostgreSQL database', { source: 'Database' });
});

pool.on('error', (err) => {
  logDbError('Pool connection error', err);
  poolStats.errors++;
  poolStats.lastError = new Date();
  // Don't exit on pool errors in production, let circuit breaker handle it
  if (process.env.NODE_ENV === 'development') {
    process.exit(-1);
  }
});

// Monitor for pool exhaustion
pool.on('acquire', () => {
  const { totalCount, idleCount, waitingCount } = pool;
  if (waitingCount > 0) {
    logger.warn('Database pool has waiting connections', {
      total: totalCount,
      idle: idleCount,
      waiting: waitingCount,
    });
  }
});

/**
 * Update pool statistics with new query time
 */
function updateStats(durationMs: number, isError: boolean = false): void {
  poolStats.totalQueries++;

  if (isError) {
    poolStats.errors++;
    poolStats.lastError = new Date();
    return;
  }

  // Track slow queries
  if (isSlowQuery(durationMs)) {
    poolStats.slowQueries++;
  }

  // Keep rolling window of last 100 query times for average
  poolStats.queryTimes.push(durationMs);
  if (poolStats.queryTimes.length > 100) {
    poolStats.queryTimes.shift();
  }

  // Calculate average
  poolStats.avgQueryTimeMs =
    poolStats.queryTimes.reduce((a, b) => a + b, 0) / poolStats.queryTimes.length;
}

/**
 * Execute a database query with optional generic type support
 *
 * Features:
 * - Automatic timing and logging
 * - Slow query detection (>1s logged as warning)
 * - Statistics tracking for monitoring
 * - Statement timeout enforcement at connection level
 *
 * @example
 * // Simple query
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 *
 * // With type parameter
 * const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
 * const user = result.rows[0];
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[]
): Promise<QueryResult<T & QueryResultRow>> {
  const start = Date.now();
  try {
    const res = await pool.query<T & QueryResultRow>(text, params);
    const duration = Date.now() - start;

    // Update statistics
    updateStats(duration);

    // Log slow queries as warnings
    if (isSlowQuery(duration)) {
      logger.warn(`Slow query detected (${duration}ms)`, {
        sql: text.substring(0, 200), // Truncate for logging
        duration,
        threshold: DB_DEFAULTS.SLOW_QUERY_THRESHOLD_MS,
        rows: res.rowCount,
      });
    } else {
      // Log successful queries in debug mode
      logDebug(`Query executed in ${duration}ms`, {
        source: 'Database',
        sql: text,
        params,
        rows: res.rowCount,
        duration,
      });
    }

    return res;
  } catch (error) {
    const duration = Date.now() - start;
    updateStats(duration, true);

    // Log database errors with full details
    logDbError('Query failed', error, { sql: text, params, duration });
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
    logDebug('Health check passed', { source: 'Database', time: result.rows[0].current_time });
    return true;
  } catch (error) {
    logDbError('Health check failed', error);
    return false;
  }
}

/**
 * Close database connections
 * Call this during application shutdown for clean cleanup
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logDebug('Connection pool closed', { source: 'Database' });
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats(): {
  totalQueries: number;
  slowQueries: number;
  errors: number;
  lastError: Date | null;
  avgQueryTimeMs: number;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
} {
  return {
    totalQueries: poolStats.totalQueries,
    slowQueries: poolStats.slowQueries,
    errors: poolStats.errors,
    lastError: poolStats.lastError,
    avgQueryTimeMs: Math.round(poolStats.avgQueryTimeMs * 100) / 100,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  };
}

/**
 * Reset pool statistics (useful for testing)
 */
export function resetPoolStats(): void {
  poolStats.totalQueries = 0;
  poolStats.slowQueries = 0;
  poolStats.errors = 0;
  poolStats.lastError = null;
  poolStats.avgQueryTimeMs = 0;
  poolStats.queryTimes = [];
}

export default pool;
