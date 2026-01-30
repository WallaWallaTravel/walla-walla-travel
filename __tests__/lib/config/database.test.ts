/**
 * Database Configuration Tests
 *
 * Tests for centralized database pool configuration.
 */

import { getDatabaseConfig, getScriptDatabaseConfig, isSlowQuery, DB_DEFAULTS } from '@/lib/config/database';

describe('getDatabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return pool configuration object', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    const config = getDatabaseConfig();

    expect(config).toHaveProperty('connectionString');
    expect(config).toHaveProperty('max');
    expect(config).toHaveProperty('idleTimeoutMillis');
    expect(config).toHaveProperty('connectionTimeoutMillis');
  });

  it('should enable SSL for Supabase URLs', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.supabase.co:5432/postgres';
    const config = getDatabaseConfig();

    expect(config.ssl).toBeTruthy();
  });

  it('should enable SSL for AWS RDS URLs', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@mydb.amazonaws.com:5432/db';
    const config = getDatabaseConfig();

    expect(config.ssl).toBeTruthy();
  });

  it('should disable SSL for local development URLs', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    const config = getDatabaseConfig();

    expect(config.ssl).toBeFalsy();
  });

  it('should use default max connections', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    const config = getDatabaseConfig();

    expect(config.max).toBe(DB_DEFAULTS.MAX_CONNECTIONS);
  });

  it('should respect DB_MAX_CONNECTIONS env var', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.DB_MAX_CONNECTIONS = '10';
    const config = getDatabaseConfig();

    expect(config.max).toBe(10);
  });

  it('should include statement timeout in options', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    const config = getDatabaseConfig();

    expect(config.options).toContain('statement_timeout');
  });
});

describe('getScriptDatabaseConfig', () => {
  it('should return config with SSL enabled', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    const config = getScriptDatabaseConfig();

    expect(config.ssl).toBeTruthy();
  });

  it('should have lower max connections for scripts', () => {
    const config = getScriptDatabaseConfig();

    expect(config.max).toBe(5);
  });

  it('should have longer statement timeout for scripts', () => {
    const config = getScriptDatabaseConfig();

    expect(config.options).toContain('300000'); // 5 minutes
  });
});

describe('isSlowQuery', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return true for queries exceeding threshold', () => {
    expect(isSlowQuery(2000)).toBe(true); // 2 seconds
  });

  it('should return false for fast queries', () => {
    expect(isSlowQuery(500)).toBe(false); // 0.5 seconds
  });

  it('should respect DB_SLOW_QUERY_THRESHOLD_MS env var', () => {
    process.env.DB_SLOW_QUERY_THRESHOLD_MS = '500';

    // Need to re-import to pick up env change
    const { isSlowQuery: isSlowQueryWithEnv } = require('@/lib/config/database');
    expect(isSlowQueryWithEnv(600)).toBe(true);
    expect(isSlowQueryWithEnv(400)).toBe(false);
  });
});

describe('DB_DEFAULTS', () => {
  it('should have reasonable default values', () => {
    expect(DB_DEFAULTS.STATEMENT_TIMEOUT_MS).toBe(30000); // 30 seconds
    expect(DB_DEFAULTS.SLOW_QUERY_THRESHOLD_MS).toBe(1000); // 1 second
    expect(DB_DEFAULTS.MAX_CONNECTIONS).toBe(20);
    expect(DB_DEFAULTS.IDLE_TIMEOUT_MS).toBe(30000); // 30 seconds
    expect(DB_DEFAULTS.CONNECTION_TIMEOUT_MS).toBe(2000); // 2 seconds
    expect(DB_DEFAULTS.MAX_USES).toBe(7500);
  });
});
