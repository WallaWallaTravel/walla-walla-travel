/**
 * TimeCardService Tests
 *
 * Tests for driver time tracking and shift management
 * Coverage target: 80%+
 */

import { TimeCardService, TimeCard, ClockInData } from '../timecard.service';
import { ConflictError, BadRequestError } from '@/lib/api/middleware/error-handler';

// Mock the db module
const mockQuery = jest.fn();

jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TimeCardService', () => {
  let service: TimeCardService;

  const mockTimeCard: TimeCard = {
    id: 1,
    driver_id: 1,
    vehicle_id: 100,
    clock_in_time: new Date('2026-01-30T08:00:00Z'),
    clock_out_time: undefined,
    work_reporting_location: 'Main Office',
    created_at: new Date('2026-01-30T08:00:00Z'),
    updated_at: new Date('2026-01-30T08:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TimeCardService();
  });

  describe('clockIn', () => {
    const clockInData: ClockInData = {
      driver_id: 1,
      vehicle_id: 100,
      work_reporting_location: 'Main Office',
    };

    it('should throw ConflictError if driver is already clocked in', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Active time card exists

      await expect(service.clockIn(clockInData)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if vehicle is in use', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No active time card for driver
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Vehicle in use

      await expect(service.clockIn(clockInData)).rejects.toThrow(ConflictError);
    });
  });

  describe('clockOut', () => {
    it('should throw BadRequestError if no active shift', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No active time card

      await expect(service.clockOut(1)).rejects.toThrow(BadRequestError);
    });
  });

  describe('getActiveTimeCard', () => {
    it('should return active time card for driver', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTimeCard] });

      const result = await service.getActiveTimeCard(1);

      expect(result).toEqual(mockTimeCard);
    });

    it('should return null if no active time card', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getActiveTimeCard(1);

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should propagate database errors from getActiveTimeCard', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.getActiveTimeCard(1)).rejects.toThrow('Database connection failed');
    });
  });
});
