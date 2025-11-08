/**
 * Database Configuration
 * Centralized database connection settings
 */

import { PoolConfig } from 'pg';

/**
 * Get database configuration based on environment
 */
export function getDatabaseConfig(): PoolConfig {
  // Heroku Postgres ALWAYS requires SSL, even in development
  const requiresSsl = process.env.DATABASE_URL?.includes('amazonaws.com') || 
                      process.env.DATABASE_URL?.includes('heroku');
  
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: requiresSsl
      ? {
          rejectUnauthorized: false, // Required for Heroku/AWS RDS
        }
      : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
    maxUses: 7500, // Close and replace connections after 7500 queries (prevents memory leaks)
    allowExitOnIdle: true, // Allow the pool to close all connections and exit when idle
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
  };
}

