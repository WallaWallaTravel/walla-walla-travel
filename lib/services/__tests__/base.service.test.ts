/**
 * BaseService Tests
 *
 * CRITICAL: Tests for the service layer foundation
 * All services inherit from BaseService, so this coverage is essential
 *
 * Key features tested:
 * - Query methods (query, queryOne, queryMany, queryCount)
 * - CRUD operations (findById, findWhere, insert, update, delete)
 * - Transaction support (withTransaction)
 * - Pagination helpers
 * - Error handling
 */

import { createMockQueryResult } from '../../__tests__/test-utils';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock transaction module
jest.mock('../../db/transaction', () => ({
  withTransaction: jest.fn((callback) => callback({ query: jest.fn() })),
}));

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock error logger
jest.mock('../../monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

import { BaseService } from '../base.service';
import { withTransaction } from '../../db/transaction';

// Create a concrete implementation for testing
class TestService extends BaseService {
  protected get serviceName() {
    return 'TestService';
  }

  // Expose protected methods for testing
  public testQuery<T>(sql: string, params?: unknown[]) {
    return this.query<T>(sql, params);
  }

  public testQueryOne<T>(sql: string, params?: unknown[]) {
    return this.queryOne<T>(sql, params);
  }

  public testQueryMany<T>(sql: string, params?: unknown[]) {
    return this.queryMany<T>(sql, params);
  }

  public testQueryCount(sql: string, params?: unknown[]) {
    return this.queryCount(sql, params);
  }

  public testExists(table: string, condition: string, params: unknown[]) {
    return this.exists(table, condition, params);
  }

  public testFindById<T>(table: string, id: number | string, columns?: string) {
    return this.findById<T>(table, id, columns);
  }

  public testFindWhere<T>(
    table: string,
    condition: string,
    params: unknown[],
    columns?: string,
    orderBy?: string,
    limit?: number
  ) {
    return this.findWhere<T>(table, condition, params, columns, orderBy, limit);
  }

  public testInsert<T>(table: string, data: Record<string, unknown>, returning?: string) {
    return this.insert<T>(table, data, returning);
  }

  public testUpdate<T>(table: string, id: number | string, data: Record<string, unknown>, returning?: string) {
    return this.update<T>(table, id, data, returning);
  }

  public testDelete(table: string, id: number | string) {
    return this.delete(table, id);
  }

  public testSoftDelete(table: string, id: number | string) {
    return this.softDelete(table, id);
  }

  public testPaginate<T>(baseQuery: string, params: unknown[], limit?: number, offset?: number) {
    return this.paginate<T>(baseQuery, params, limit, offset);
  }

  public testWithTransaction<T>(callback: (client: unknown) => Promise<T>) {
    return this.withTransaction(callback);
  }

  public testHandleError(error: unknown, context: string) {
    return this.handleError(error, context);
  }

  public testLog(message: string, data?: Record<string, unknown>) {
    return this.log(message, data);
  }

  public testWarn(message: string, data?: Record<string, unknown>) {
    return this.warn(message, data);
  }
}

describe('BaseService', () => {
  let service: TestService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new TestService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Query Methods Tests
  // ============================================================================

  describe('query methods', () => {
    describe('query()', () => {
      it('should execute SQL query with parameters', async () => {
        const mockResult = { rows: [{ id: 1, name: 'Test' }], rowCount: 1 };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await service.testQuery('SELECT * FROM users WHERE id = $1', [1]);

        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
        expect(result.rows).toHaveLength(1);
        expect(result.rowCount).toBe(1);
      });

      it('should execute SQL query without parameters', async () => {
        const mockResult = { rows: [{ count: 5 }], rowCount: 1 };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await service.testQuery<{ count: number }>('SELECT COUNT(*) FROM users');

        expect(mockQuery).toHaveBeenCalledWith('SELECT COUNT(*) FROM users', undefined);
        expect(result.rows[0].count).toBe(5);
      });

      it('should throw on database error', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

        await expect(service.testQuery('SELECT 1')).rejects.toThrow('Connection failed');
      });
    });

    describe('queryOne()', () => {
      it('should return first row when found', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, name: 'First' }]));

        const result = await service.testQueryOne<{ id: number; name: string }>('SELECT * FROM users LIMIT 1');

        expect(result).toEqual({ id: 1, name: 'First' });
      });

      it('should return null when no rows found', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        const result = await service.testQueryOne('SELECT * FROM users WHERE id = $1', [999]);

        expect(result).toBeNull();
      });

      it('should return only first row when multiple exist', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([
          { id: 1, name: 'First' },
          { id: 2, name: 'Second' },
        ]));

        const result = await service.testQueryOne<{ id: number; name: string }>('SELECT * FROM users');

        expect(result?.id).toBe(1);
        expect(result?.name).toBe('First');
      });
    });

    describe('queryMany()', () => {
      it('should return all rows', async () => {
        const mockRows = [
          { id: 1, name: 'First' },
          { id: 2, name: 'Second' },
          { id: 3, name: 'Third' },
        ];
        mockQuery.mockResolvedValueOnce(createMockQueryResult(mockRows));

        const result = await service.testQueryMany<{ id: number; name: string }>('SELECT * FROM users');

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('First');
        expect(result[2].name).toBe('Third');
      });

      it('should return empty array when no rows', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        const result = await service.testQueryMany('SELECT * FROM users WHERE 1=0');

        expect(result).toEqual([]);
      });
    });

    describe('queryCount()', () => {
      it('should parse count as integer', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '42' }]));

        const result = await service.testQueryCount('SELECT COUNT(*) as count FROM users');

        expect(result).toBe(42);
        expect(typeof result).toBe('number');
      });

      it('should return 0 when count is empty', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        const result = await service.testQueryCount('SELECT COUNT(*) as count FROM users');

        expect(result).toBe(0);
      });

      it('should handle large counts', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1000000' }]));

        const result = await service.testQueryCount('SELECT COUNT(*) as count FROM large_table');

        expect(result).toBe(1000000);
      });
    });

    describe('exists()', () => {
      it('should return true when record exists', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));

        const result = await service.testExists('users', 'id = $1', [1]);

        expect(result).toBe(true);
      });

      it('should return false when record does not exist', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: false }]));

        const result = await service.testExists('users', 'id = $1', [999]);

        expect(result).toBe(false);
      });

      it('should build correct EXISTS query', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));

        await service.testExists('bookings', 'customer_id = $1 AND status = $2', [1, 'confirmed']);

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT EXISTS(SELECT 1 FROM bookings WHERE customer_id = $1 AND status = $2) as exists',
          [1, 'confirmed']
        );
      });
    });
  });

  // ============================================================================
  // CRUD Operations Tests
  // ============================================================================

  describe('CRUD operations', () => {
    describe('findById()', () => {
      it('should find record by ID', async () => {
        const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));

        const result = await service.testFindById<typeof mockUser>('users', 1);

        expect(result).toEqual(mockUser);
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      });

      it('should find record with specific columns', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, name: 'Test' }]));

        await service.testFindById('users', 1, 'id, name');

        expect(mockQuery).toHaveBeenCalledWith('SELECT id, name FROM users WHERE id = $1', [1]);
      });

      it('should return null when record not found', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        const result = await service.testFindById('users', 999);

        expect(result).toBeNull();
      });

      it('should handle string IDs', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 'abc-123' }]));

        await service.testFindById('sessions', 'abc-123');

        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM sessions WHERE id = $1', ['abc-123']);
      });
    });

    describe('findWhere()', () => {
      it('should find records with condition', async () => {
        const mockRecords = [{ id: 1 }, { id: 2 }];
        mockQuery.mockResolvedValueOnce(createMockQueryResult(mockRecords));

        const result = await service.testFindWhere('users', 'is_active = $1', [true]);

        expect(result).toHaveLength(2);
      });

      it('should apply ORDER BY clause', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        await service.testFindWhere('users', 'role = $1', ['admin'], '*', 'created_at DESC');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY created_at DESC'),
          expect.any(Array)
        );
      });

      it('should apply LIMIT clause', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        await service.testFindWhere('logs', 'level = $1', ['error'], '*', undefined, 100);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT 100'),
          expect.any(Array)
        );
      });

      it('should apply both ORDER BY and LIMIT', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        await service.testFindWhere('bookings', 'status = $1', ['pending'], 'id, created_at', 'created_at ASC', 10);

        const call = mockQuery.mock.calls[0][0];
        expect(call).toContain('SELECT id, created_at FROM bookings');
        expect(call).toContain('ORDER BY created_at ASC');
        expect(call).toContain('LIMIT 10');
      });
    });

    describe('insert()', () => {
      it('should insert record and return it', async () => {
        const newRecord = { id: 1, name: 'New User', email: 'new@example.com' };
        mockQuery.mockResolvedValueOnce(createMockQueryResult([newRecord]));

        const result = await service.testInsert('users', { name: 'New User', email: 'new@example.com' });

        expect(result).toEqual(newRecord);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          ['New User', 'new@example.com']
        );
      });

      it('should build correct INSERT query with placeholders', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

        await service.testInsert('bookings', {
          customer_id: 1,
          tour_date: '2025-01-15',
          party_size: 4,
          status: 'pending',
        });

        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toContain('customer_id, tour_date, party_size, status');
        expect(sql).toContain('$1, $2, $3, $4');
        expect(sql).toContain('RETURNING *');
      });

      it('should use custom RETURNING clause', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

        await service.testInsert('users', { name: 'Test' }, 'id');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('RETURNING id'),
          expect.any(Array)
        );
      });
    });

    describe('update()', () => {
      it('should update record and return it', async () => {
        const updatedRecord = { id: 1, name: 'Updated Name', status: 'active' };
        mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedRecord]));

        const result = await service.testUpdate('users', 1, { name: 'Updated Name', status: 'active' });

        expect(result).toEqual(updatedRecord);
      });

      it('should not allow updating ID field', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, name: 'Test' }]));

        await service.testUpdate('users', 1, { id: 999, name: 'Test' });

        // The id=999 should not be in the SET clause (only id for WHERE clause)
        const sql = mockQuery.mock.calls[0][0];
        // SET clause should only have name, not id
        expect(sql).toContain('SET name = $1');
        // id=999 should not appear in parameters for SET
        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toBe('Test'); // First param is name value
        expect(params[1]).toBe(1); // Second param is WHERE id value (not 999)
      });

      it('should build correct UPDATE query', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

        await service.testUpdate('bookings', 5, {
          status: 'confirmed',
          total_price: 500,
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('UPDATE bookings');
        expect(sql).toContain('SET status = $1, total_price = $2');
        expect(sql).toContain('WHERE id = $3');
        expect(params).toEqual(['confirmed', 500, 5]);
      });

      it('should return null when record not found', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        const result = await service.testUpdate('users', 999, { name: 'Test' });

        expect(result).toBeNull();
      });
    });

    describe('delete()', () => {
      it('should delete record and return true', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const result = await service.testDelete('users', 1);

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [1]);
      });

      it('should return false when no record deleted', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await service.testDelete('users', 999);

        expect(result).toBe(false);
      });
    });

    describe('softDelete()', () => {
      it('should set deleted_at timestamp', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const result = await service.testSoftDelete('users', 1);

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SET deleted_at = NOW()'),
          [1]
        );
      });

      it('should only soft delete non-deleted records', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await service.testSoftDelete('users', 1);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          [1]
        );
      });

      it('should return false when already deleted', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await service.testSoftDelete('users', 1);

        expect(result).toBe(false);
      });
    });
  });

  // ============================================================================
  // Pagination Tests
  // ============================================================================

  describe('pagination', () => {
    describe('paginate()', () => {
      it('should return paginated results with metadata', async () => {
        // Mock count query
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '100' }]));
        // Mock data query
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }, { id: 2 }]));

        const result = await service.testPaginate(
          'SELECT * FROM users',
          [],
          50,
          0
        );

        expect(result.total).toBe(100);
        expect(result.data).toHaveLength(2);
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
        expect(result.hasMore).toBe(true);
      });

      it('should set hasMore to false on last page', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '5' }]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 4 }, { id: 5 }]));

        const result = await service.testPaginate(
          'SELECT * FROM users',
          [],
          10,
          3
        );

        expect(result.hasMore).toBe(false);
      });

      it('should use default limit of 50', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '10' }]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        const result = await service.testPaginate('SELECT * FROM users', []);

        expect(result.limit).toBe(50);
      });

      it('should handle parameters correctly', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '20' }]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        await service.testPaginate(
          'SELECT * FROM users WHERE status = $1',
          ['active'],
          10,
          0
        );

        // Data query should have params: ['active', 10, 0]
        expect(mockQuery.mock.calls[1][1]).toEqual(['active', 10, 0]);
      });
    });
  });

  // ============================================================================
  // Transaction Tests
  // ============================================================================

  describe('transactions', () => {
    describe('withTransaction()', () => {
      it('should execute callback in transaction', async () => {
        const mockCallback = jest.fn().mockResolvedValue({ id: 1 });

        await service.testWithTransaction(mockCallback);

        expect(withTransaction).toHaveBeenCalledWith(mockCallback);
        expect(mockCallback).toHaveBeenCalled();
      });

      it('should return callback result', async () => {
        const expectedResult = { id: 1, name: 'Created' };
        (withTransaction as jest.Mock).mockImplementationOnce((cb) => cb({}));

        const mockCallback = jest.fn().mockResolvedValue(expectedResult);
        const result = await service.testWithTransaction(mockCallback);

        expect(result).toEqual(expectedResult);
      });

      it('should throw on transaction error', async () => {
        (withTransaction as jest.Mock).mockRejectedValueOnce(new Error('Transaction failed'));

        await expect(
          service.testWithTransaction(() => Promise.resolve())
        ).rejects.toThrow('Transaction failed');
      });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should log errors with service context', () => {
      const { logError } = require('../../monitoring/error-logger');
      const testError = new Error('Database connection lost');

      service.testHandleError(testError, 'query');

      expect(logError).toHaveBeenCalledWith({
        errorType: 'TestService:query',
        errorMessage: 'Database connection lost',
        stackTrace: expect.any(String),
        metadata: {
          service: 'TestService',
          context: 'query',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle non-Error objects', () => {
      const { logError } = require('../../monitoring/error-logger');

      service.testHandleError('String error message', 'operation');

      expect(logError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'String error message',
        })
      );
    });
  });

  // ============================================================================
  // Logging Tests
  // ============================================================================

  describe('logging', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      (process.env as { NODE_ENV: string }).NODE_ENV = originalEnv as string;
    });

    it('should log info messages in development', () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'development';
      const { logger } = require('../../logger');

      service.testLog('Operation completed', { id: 1 });

      expect(logger.info).toHaveBeenCalledWith(
        'TestService: Operation completed',
        { id: 1 }
      );
    });

    it('should log warnings in any environment', () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
      const { logger } = require('../../logger');

      service.testWarn('Slow query detected', { duration: 5000 });

      expect(logger.warn).toHaveBeenCalledWith(
        'TestService: Slow query detected',
        { duration: 5000 }
      );
    });
  });
});
