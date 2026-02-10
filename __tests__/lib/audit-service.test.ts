/**
 * Tests for Audit Service
 * @module lib/services/audit.service
 *
 * Tests activity logging, IP extraction, suspicious activity detection,
 * and log querying.
 */

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((cb: any) => cb(require('@/lib/db').query)),
}));

// Get reference to the mock after jest.mock hoisting
const mockQuery = require('@/lib/db').query as jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

import { auditService } from '@/lib/services/audit.service';
import { logger } from '@/lib/logger';

function createMockRequest(headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    headers: {
      get: jest.fn((name: string) => headers[name] || null),
    },
    nextUrl: { pathname: '/api/test' },
  } as any;
}

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // logActivity
  // ===========================================================================

  describe('logActivity', () => {
    it('should insert audit log entry', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await auditService.logActivity({
        userId: 1,
        action: 'login',
        details: { browser: 'Chrome' },
        ipAddress: '192.168.1.1',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_activity_logs'),
        [1, 'login', JSON.stringify({ browser: 'Chrome' }), '192.168.1.1']
      );
    });

    it('should use empty object for undefined details', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await auditService.logActivity({
        userId: 1,
        action: 'logout',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'logout', '{}', null]
      );
    });

    it('should not throw on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        auditService.logActivity({
          userId: 1,
          action: 'login',
        })
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        '[AuditService] Failed to log activity',
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // getIpFromRequest
  // ===========================================================================

  describe('getIpFromRequest', () => {
    it('should extract IP from x-forwarded-for', () => {
      const request = createMockRequest({
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      });

      expect(auditService.getIpFromRequest(request)).toBe('10.0.0.1');
    });

    it('should fall back to x-real-ip', () => {
      const request = createMockRequest({
        'x-real-ip': '172.16.0.1',
      });

      expect(auditService.getIpFromRequest(request)).toBe('172.16.0.1');
    });

    it('should return unknown when no IP headers', () => {
      const request = createMockRequest({});

      expect(auditService.getIpFromRequest(request)).toBe('unknown');
    });

    it('should trim whitespace from forwarded-for', () => {
      const request = createMockRequest({
        'x-forwarded-for': '  10.0.0.1  , 10.0.0.2',
      });

      expect(auditService.getIpFromRequest(request)).toBe('10.0.0.1');
    });
  });

  // ===========================================================================
  // logFromRequest
  // ===========================================================================

  describe('logFromRequest', () => {
    it('should enrich details with request context', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const request = createMockRequest({
        'x-forwarded-for': '10.0.0.1',
        'user-agent': 'Mozilla/5.0',
      });

      await auditService.logFromRequest(request, 1, 'booking_created', { bookingId: 42 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [
          1,
          'booking_created',
          expect.stringContaining('"bookingId":42'),
          '10.0.0.1',
        ]
      );

      const detailsArg = mockQuery.mock.calls[0][1]![2] as string;
      const details = JSON.parse(detailsArg);
      expect(details.userAgent).toBe('Mozilla/5.0');
      expect(details.path).toBe('/api/test');
      expect(details.method).toBe('POST');
    });

    it('should truncate long user agents', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const request = createMockRequest({
        'user-agent': 'A'.repeat(300),
      });

      await auditService.logFromRequest(request, 1, 'login');

      const detailsArg = mockQuery.mock.calls[0][1]![2] as string;
      const details = JSON.parse(detailsArg);
      expect(details.userAgent.length).toBe(200);
    });
  });

  // ===========================================================================
  // getLogsForUser
  // ===========================================================================

  describe('getLogsForUser', () => {
    it('should query logs for a user with defaults', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, action: 'login', user_id: 1 }],
        rowCount: 1,
      } as any);

      const result = await auditService.getLogsForUser(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        [1, 50, 0]
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by action when specified', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await auditService.getLogsForUser(1, { action: 'login_failed' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('action = $2'),
        [1, 'login_failed', 50, 0]
      );
    });

    it('should respect limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await auditService.getLogsForUser(1, { limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 10, 20]
      );
    });
  });

  // ===========================================================================
  // getRecentAdminActivities
  // ===========================================================================

  describe('getRecentAdminActivities', () => {
    it('should query admin-specific actions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await auditService.getRecentAdminActivities();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('action = ANY($1)'),
        expect.arrayContaining([
          expect.arrayContaining([
            'user_created', 'settings_updated', 'booking_cancelled',
          ]),
        ])
      );
    });

    it('should use custom limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await auditService.getRecentAdminActivities(10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });
  });

  // ===========================================================================
  // getActivitiesInRange
  // ===========================================================================

  describe('getActivitiesInRange', () => {
    it('should query by date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');

      await auditService.getActivitiesInRange(start, end);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1'),
        [start, end]
      );
    });

    it('should filter by userId and action when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');

      await auditService.getActivitiesInRange(start, end, {
        userId: 5,
        action: 'login',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $3'),
        [start, end, 5, 'login']
      );
    });
  });

  // ===========================================================================
  // checkSuspiciousActivity
  // ===========================================================================

  describe('checkSuspiciousActivity', () => {
    it('should detect suspicious activity when above threshold', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '6' }],
        rowCount: 1,
      } as any);

      const result = await auditService.checkSuspiciousActivity('10.0.0.1');

      expect(result.suspicious).toBe(true);
      expect(result.attempts).toBe(6);
    });

    it('should not flag when below threshold', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      } as any);

      const result = await auditService.checkSuspiciousActivity('10.0.0.1');

      expect(result.suspicious).toBe(false);
      expect(result.attempts).toBe(3);
    });

    it('should handle zero attempts', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      } as any);

      const result = await auditService.checkSuspiciousActivity('10.0.0.1');

      expect(result.suspicious).toBe(false);
      expect(result.attempts).toBe(0);
    });

    it('should respect custom window and threshold', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      } as any);

      const result = await auditService.checkSuspiciousActivity('10.0.0.1', 30, 3);

      expect(result.suspicious).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("30 minutes"),
        ['10.0.0.1']
      );
    });

    it('should handle empty result', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await auditService.checkSuspiciousActivity('10.0.0.1');

      expect(result.suspicious).toBe(false);
      expect(result.attempts).toBe(0);
    });
  });
});
