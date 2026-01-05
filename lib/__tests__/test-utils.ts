/**
 * Test Utilities
 * Shared utilities for testing
 */

import { Pool } from 'pg';

/**
 * Check if a test database is available
 * Used to conditionally skip integration tests
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('heroku') ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 3000,
    });
    await pool.query('SELECT 1');
    await pool.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if integration tests should be skipped
 * Returns true if TEST_DATABASE_URL is not set
 */
export function shouldSkipIntegrationTests(): boolean {
  return !process.env.TEST_DATABASE_URL;
}

// Mock database query results
export function createMockQueryResult<T>(rows: T[], rowCount?: number) {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

// Mock pool for database tests
export function createMockPool(): jest.Mocked<Pool> {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  } as unknown as jest.Mocked<Pool>;

  return mockPool;
}

// Mock request object for API tests
export function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
) {
  const url = new URL(options.url || 'http://localhost:3000/api/v1/test');

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return {
    method: options.method || 'GET',
    url: url.toString(),
    headers: new Headers(options.headers || {}),
    json: jest.fn().mockResolvedValue(options.body || {}),
    text: jest.fn().mockResolvedValue(JSON.stringify(options.body || {})),
    nextUrl: {
      searchParams: url.searchParams,
    },
  } as unknown as ReturnType<typeof import('next/server').NextRequest['prototype']['constructor']>;
}

// Mock response object for API tests
export function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
  } as unknown as ReturnType<typeof import('next/server').NextResponse['prototype']['constructor']>;
}

// Wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clean test data from database (for integration tests)
export async function cleanupTestData(pool: Pool, tables: string[]) {
  for (const table of tables) {
    await pool.query(`DELETE FROM ${table} WHERE created_at > NOW() - INTERVAL '1 hour'`);
  }
}

/**
 * Reset database for testing
 *
 * For unit tests: No-op (pass no arguments)
 * For integration tests: Pass an explicit pool to clean test data
 *
 * @param pool - Optional database pool. If not provided, this is a no-op.
 */
export async function resetDb(pool?: Pool): Promise<void> {
  // No-op for unit tests - integration tests should call with explicit pool
  if (!pool) {
    return;
  }

  const testTables = [
    'booking_timeline',
    'payments',
    'booking_wineries',
    'lunch_orders',
    'bookings',
    'reservations',
    'proposals',
    'customers',
  ];
  await cleanupTestData(pool, testTables);
}

// Generate random test data
export function generateRandomString(length: number = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

export function generateRandomEmail(): string {
  return `test-${generateRandomString()}@example.com`;
}

export function generateRandomPhone(): string {
  return `+1-509-555-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Date helpers
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getTomorrowDate(): string {
  return formatDate(addDays(new Date(), 1));
}

export function getNextWeekDate(): string {
  return formatDate(addDays(new Date(), 7));
}

// Test data matchers
export function expectValidDate(value: unknown) {
  expect(value).toBeDefined();
  expect(new Date(value).toString()).not.toBe('Invalid Date');
}

export function expectValidUUID(value: unknown) {
  expect(value).toBeDefined();
  expect(typeof value).toBe('number');
  expect(value).toBeGreaterThan(0);
}

export function expectValidBookingNumber(value: unknown) {
  expect(value).toBeDefined();
  expect(value).toMatch(/^(WWT|NWT|HCWT)-\d{4}-\d+$/);
}

export function expectValidProposalNumber(value: unknown) {
  expect(value).toBeDefined();
  expect(value).toMatch(/^PROP-\d{4}-\d+$/);
}

// API response helpers
export async function expectSuccessResponse(response: Response) {
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data).toBeDefined();
  return data.data;
}

export async function expectErrorResponse(response: Response, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data.success).toBe(false);
  expect(data.error).toBeDefined();
  return data.error;
}
