/**
 * Unit Tests for LodgingClickService
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((cb: any) => cb(require('@/lib/db').query)),
}));

const mockQuery = require('@/lib/db').query as jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logDbError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

import { lodgingClickService } from '@/lib/services/lodging-click.service';

// ============================================================================
// Helpers
// ============================================================================

function makeClickRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    property_id: 10,
    property_slug: 'test-hotel',
    platform: 'airbnb',
    referrer: 'https://google.com',
    user_agent: 'Mozilla/5.0',
    ip_address: '192.168.1.1',
    session_id: 'sess_abc123',
    created_at: new Date('2025-07-01T10:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('LodgingClickService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  // ==========================================================================
  // recordClick
  // ==========================================================================

  describe('recordClick', () => {
    it('should insert click with all fields', async () => {
      const click = makeClickRow();
      mockQuery.mockResolvedValueOnce({ rows: [click], rowCount: 1 });

      const result = await lodgingClickService.recordClick({
        property_id: 10,
        property_slug: 'test-hotel',
        platform: 'airbnb',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
        session_id: 'sess_abc123',
      });

      expect(result).toEqual(click);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO lodging_clicks');
      expect(sql).toContain('RETURNING *');
      expect(params).toEqual([
        10, 'test-hotel', 'airbnb', 'https://google.com',
        'Mozilla/5.0', '192.168.1.1', 'sess_abc123',
      ]);
    });

    it('should handle optional fields being undefined', async () => {
      const click = makeClickRow({
        property_slug: undefined,
        platform: undefined,
        referrer: undefined,
        user_agent: undefined,
        ip_address: undefined,
        session_id: undefined,
      });
      mockQuery.mockResolvedValueOnce({ rows: [click], rowCount: 1 });

      const result = await lodgingClickService.recordClick({
        property_id: 10,
      });

      expect(result).toBeDefined();
      const params = mockQuery.mock.calls[0][1];
      expect(params).toEqual([
        10, undefined, undefined, undefined, undefined, undefined, undefined,
      ]);
    });
  });

  // ==========================================================================
  // getClickStats
  // ==========================================================================

  describe('getClickStats', () => {
    it('should return aggregated stats per property', async () => {
      const rows = [
        { property_id: 10, property_name: 'Hotel A', property_slug: 'hotel-a', total_clicks: 50, last_click_at: new Date() },
        { property_id: 20, property_name: 'Hotel B', property_slug: 'hotel-b', total_clicks: 30, last_click_at: new Date() },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

      const result = await lodgingClickService.getClickStats();

      expect(result).toHaveLength(2);
      expect(result[0].total_clicks).toBe(50);
      expect(result[1].property_name).toBe('Hotel B');
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('COUNT');
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('ORDER BY total_clicks DESC');
    });

    it('should filter by date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getClickStats({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
      });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('created_at >= $1');
      expect(sql).toContain('created_at <= $2');
      expect(params).toEqual(['2025-06-01', '2025-06-30']);
    });

    it('should respect limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getClickStats({ limit: 5 });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('LIMIT $1');
      expect(params).toEqual([5]);
    });
  });

  // ==========================================================================
  // getPropertyClicks
  // ==========================================================================

  describe('getPropertyClicks', () => {
    it('should return clicks for a specific property', async () => {
      const clicks = [makeClickRow(), makeClickRow({ id: 2 })];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: clicks, rowCount: 2 });

      const result = await lodgingClickService.getPropertyClicks(10);

      expect(result.clicks).toHaveLength(2);
      // First query is the count
      const [countSql, countParams] = mockQuery.mock.calls[0];
      expect(countSql).toContain('COUNT(*)');
      expect(countParams).toEqual([10]);
    });

    it('should return total count', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '25' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await lodgingClickService.getPropertyClicks(10);

      expect(result.total).toBe(25);
    });

    it('should apply pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getPropertyClicks(10, { limit: 20, offset: 40 });

      const [sql, params] = mockQuery.mock.calls[1];
      expect(sql).toContain('LIMIT $2');
      expect(sql).toContain('OFFSET $3');
      expect(params).toEqual([10, 20, 40]);
    });

    it('should default to limit 50 and offset 0', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getPropertyClicks(10);

      const params = mockQuery.mock.calls[1][1];
      expect(params).toEqual([10, 50, 0]);
    });
  });

  // ==========================================================================
  // getPlatformBreakdown
  // ==========================================================================

  describe('getPlatformBreakdown', () => {
    it('should return click counts by platform', async () => {
      const rows = [
        { platform: 'airbnb', click_count: 45 },
        { platform: 'direct', click_count: 30 },
        { platform: 'vrbo', click_count: 12 },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 3 });

      const result = await lodgingClickService.getPlatformBreakdown();

      expect(result).toHaveLength(3);
      expect(result[0].platform).toBe('airbnb');
      expect(result[0].click_count).toBe(45);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('GROUP BY platform');
      expect(sql).toContain('ORDER BY click_count DESC');
    });

    it('should default null platform to direct', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getPlatformBreakdown();

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("COALESCE(platform, 'direct')");
    });

    it('should filter by date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getPlatformBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('created_at >= $1');
      expect(sql).toContain('created_at <= $2');
      expect(params).toEqual(['2025-01-01', '2025-12-31']);
    });
  });

  // ==========================================================================
  // getClickTrends
  // ==========================================================================

  describe('getClickTrends', () => {
    it('should return daily click counts', async () => {
      const rows = [
        { date: '2025-07-01', click_count: 10 },
        { date: '2025-07-02', click_count: 15 },
        { date: '2025-07-03', click_count: 8 },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 3 });

      const result = await lodgingClickService.getClickTrends(7);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-07-01');
      expect(result[1].click_count).toBe(15);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('DATE(created_at)');
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('ORDER BY date ASC');
      expect(params).toEqual([7]);
    });

    it('should default to 30 days', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingClickService.getClickTrends();

      const params = mockQuery.mock.calls[0][1];
      expect(params).toEqual([30]);
    });
  });

  // ==========================================================================
  // getTotalClicks
  // ==========================================================================

  describe('getTotalClicks', () => {
    it('should return total click count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1234' }], rowCount: 1 });

      const result = await lodgingClickService.getTotalClicks();

      expect(result).toBe(1234);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('COUNT(*)');
    });

    it('should filter by date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 });

      const result = await lodgingClickService.getTotalClicks({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
      });

      expect(result).toBe(50);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('created_at >= $1');
      expect(sql).toContain('created_at <= $2');
      expect(params).toEqual(['2025-06-01', '2025-06-30']);
    });

    it('should return 0 when no rows found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await lodgingClickService.getTotalClicks();

      expect(result).toBe(0);
    });
  });
});
