/**
 * Database Configuration
 * Centralized database connection settings with reliability features
 *
 * @module lib/config/database
 * @description Configures PostgreSQL connection pool with:
 * - Statement timeouts to prevent long-running queries
 * - Connection pooling with proper limits
 * - SSL configuration for cloud providers
 */

import { PoolConfig } from 'pg';

/**
 * Default timeouts and limits
 */
export const DB_DEFAULTS = {
  /** Statement timeout in milliseconds (30 seconds) */
  STATEMENT_TIMEOUT_MS: 30000,
  /** Slow query threshold in milliseconds (1 second) */
  SLOW_QUERY_THRESHOLD_MS: 1000,
  /** Maximum connections in pool */
  MAX_CONNECTIONS: 20,
  /** Idle timeout in milliseconds */
  IDLE_TIMEOUT_MS: 30000,
  /** Connection timeout in milliseconds */
  CONNECTION_TIMEOUT_MS: 2000,
  /** Max queries per connection before replacement */
  MAX_USES: 7500,
};

/**
 * Get database configuration based on environment
 * Includes statement timeout to prevent long-running queries
 */
export function getDatabaseConfig(): PoolConfig {
  // Heroku Postgres ALWAYS requires SSL, even in development
  const requiresSsl = process.env.DATABASE_URL?.includes('amazonaws.com') ||
    process.env.DATABASE_URL?.includes('heroku') ||
    process.env.DATABASE_URL?.includes('supabase.co') ||
    process.env.DATABASE_URL?.includes('pooler.supabase.com');

  // Custom statement timeout from env or default
  const statementTimeout = parseInt(
    process.env.DB_STATEMENT_TIMEOUT_MS || String(DB_DEFAULTS.STATEMENT_TIMEOUT_MS),
    10
  );

  return {
    connectionString: process.env.DATABASE_URL,
    ssl: requiresSsl
      ? {
          rejectUnauthorized: false, // Required for Heroku/AWS RDS/Supabase
        }
      : false,
    max: parseInt(process.env.DB_MAX_CONNECTIONS || String(DB_DEFAULTS.MAX_CONNECTIONS), 10),
    idleTimeoutMillis: DB_DEFAULTS.IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DB_DEFAULTS.CONNECTION_TIMEOUT_MS,
    maxUses: DB_DEFAULTS.MAX_USES,
    allowExitOnIdle: true,
    // Set statement_timeout on each new connection
    options: `-c statement_timeout=${statementTimeout}`,
  };
}

// Alias for backward compatibility
export const getDbConfig = getDatabaseConfig;

/**
 * Get database configuration for scripts (always uses SSL)
 */
export function getScriptDatabaseConfig(): PoolConfig {
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5, // Scripts don't need as many connections
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    // Longer timeout for scripts (5 minutes)
    options: `-c statement_timeout=300000`,
  };
}

/**
 * Check if query duration exceeds slow query threshold
 */
export function isSlowQuery(durationMs: number): boolean {
  const threshold = parseInt(
    process.env.DB_SLOW_QUERY_THRESHOLD_MS || String(DB_DEFAULTS.SLOW_QUERY_THRESHOLD_MS),
    10
  );
  return durationMs > threshold;
}

