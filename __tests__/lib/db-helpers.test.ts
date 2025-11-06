/**
 * Unit Tests for Database Helpers
 */

import { queryOne, queryMany, insertOne, updateOne, deleteOne } from '@/lib/db-helpers';

// Mock the pool
jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '@/lib/db';

describe('Database Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queryOne', () => {
    it('should return first row when results exist', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test User' }],
        rowCount: 1,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await queryOne('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual({ id: 1, name: 'Test User' });
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
    });

    it('should return null when no results', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await queryOne('SELECT * FROM users WHERE id = $1', [999]);

      expect(result).toBeNull();
    });
  });

  describe('queryMany', () => {
    it('should return all rows', async () => {
      const mockResult = {
        rows: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ],
        rowCount: 2,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await queryMany('SELECT * FROM users');

      expect(result).toEqual(mockResult.rows);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no results', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await queryMany('SELECT * FROM users WHERE active = false');

      expect(result).toEqual([]);
    });
  });

  describe('insertOne', () => {
    it('should return inserted row', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'New User', email: 'test@example.com' }],
        rowCount: 1,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await insertOne(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        ['New User', 'test@example.com']
      );

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw error if no row returned', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      await expect(
        insertOne('INSERT INTO users (name) VALUES ($1) RETURNING *', ['Test'])
      ).rejects.toThrow('Failed to insert record, no row returned.');
    });
  });

  describe('updateOne', () => {
    it('should return updated row', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Updated User' }],
        rowCount: 1,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await updateOne(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
        ['Updated User', 1]
      );

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when no row updated', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await updateOne(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
        ['Test', 999]
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteOne', () => {
    it('should return true when row deleted', async () => {
      const mockResult = {
        rows: [],
        rowCount: 1,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await deleteOne('DELETE FROM users WHERE id = $1', [1]);

      expect(result).toBe(true);
    });

    it('should return false when no row deleted', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0,
      };

      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await deleteOne('DELETE FROM users WHERE id = $1', [999]);

      expect(result).toBe(false);
    });
  });
});

