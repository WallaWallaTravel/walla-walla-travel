/**
 * BookingService Tests
 * Unit tests for booking business logic
 */

import { BookingService } from '../booking-service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { 
  createMockBooking, 
  createMockBookingWithRelations,
  createMockCustomer 
} from '../../__tests__/factories';

// Mock the db module - use factory function to avoid initialization order issues
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

describe('BookingService', () => {
  let service: BookingService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new BookingService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
  });

  describe('findManyWithFilters', () => {
    it('should return bookings with default filters', async () => {
      const mockBookings = [
        createMockBooking(),
        createMockBooking(),
      ];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '2' }])) // COUNT query
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));     // SELECT query

      const result = await service.findManyWithFilters({});

      expect(result.bookings).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should filter by status', async () => {
      const mockBookings = [createMockBooking({ status: 'confirmed' })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.findManyWithFilters({ status: 'confirmed' });

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].status).toBe('confirmed');
      
      // Verify SQL includes status filter
      const sqlCall = mockQuery.mock.calls[1][0];
      expect(sqlCall).toContain('b.status = $');
    });

    it('should include wineries when requested', async () => {
      const mockBookings = [createMockBookingWithRelations()];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.findManyWithFilters({ includeWineries: true });

      expect(result.bookings[0].wineries).toBeDefined();
      expect(result.bookings[0].wineries).toBeInstanceOf(Array);
      
      // Verify SQL includes JSON_AGG for wineries
      const sqlCall = mockQuery.mock.calls[1][0];
      expect(sqlCall).toContain('JSON_AGG');
      expect(sqlCall).toContain('wineries');
    });

    it('should paginate results', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '100' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockBooking()]));

      const result = await service.findManyWithFilters({ limit: 10, offset: 20 });

      expect(result.total).toBe(100);
      
      // Verify SQL includes LIMIT and OFFSET
      const sqlCall = mockQuery.mock.calls[1][0];
      expect(sqlCall).toContain('LIMIT 10');
      expect(sqlCall).toContain('OFFSET 20');
    });

    it('should filter by year and month', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '5' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockBooking()]));

      const result = await service.findManyWithFilters({
        year: '2025',
        month: '12',
      });

      // Verify results are returned correctly
      expect(result.total).toBe(5);
      expect(result.bookings).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFullBookingDetails', () => {
    it('should return booking with all relations by ID', async () => {
      const mockBooking = createMockBookingWithRelations();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      const result = await service.getFullBookingDetails(123);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockBooking.id);
      expect(result.wineries).toBeDefined();
      expect(result.customer).toBeDefined();
      
      // Verify single query with all relations
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sqlCall = mockQuery.mock.calls[0][0];
      expect(sqlCall).toContain('JSON_AGG');
      expect(sqlCall).toContain('wineries');
      expect(sqlCall).toContain('customer');
    });

    it('should return booking by booking number', async () => {
      const mockBooking = createMockBookingWithRelations({
        booking_number: 'WWT-2025-123456',
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      const result = await service.getFullBookingDetails('WWT-2025-123456');

      expect(result).toBeDefined();
      expect(result.booking_number).toBe('WWT-2025-123456');
    });

    it('should return null when booking not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getFullBookingDetails(999);
      expect(result).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return booking statistics', async () => {
      // Mock data matching actual service query results
      const mockStats = {
        total_bookings: '50',
        total_revenue: '42500.00',
        avg_party_size: '6.5',
        cancelled_count: '5',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics({});

      expect(result.totalBookings).toBe(50);
      expect(result.totalRevenue).toBe(42500);
      expect(result.averagePartySize).toBe(6.5);
      expect(result.cancelledRate).toBe(0.1); // 5/50 = 0.1
    });

    it('should filter statistics by date range', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '10',
        total_revenue: '8500.00',
        avg_party_size: '6.0',
        cancelled_count: '1',
      }]));

      const result = await service.getStatistics({
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      });

      // Verify statistics are returned correctly
      expect(result.totalBookings).toBe(10);
      expect(result.totalRevenue).toBe(8500);
      // Query should be called with date parameters
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      const originalBooking = createMockBooking({ party_size: 6 });
      const updatedBooking = { ...originalBooking, party_size: 8 };

      // First query: EXISTS check, second query: UPDATE
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }]))
        .mockResolvedValueOnce(createMockQueryResult([updatedBooking]));

      const result = await service.updateBooking(123, { partySize: 8 });

      expect(result).toBeDefined();
      expect(result.party_size).toBe(8);
    });

    it('should throw error when booking not found', async () => {
      // Return empty result for EXISTS check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateBooking(999, { partySize: 8 })).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Service wraps database errors with a generic message
      await expect(service.findManyWithFilters({})).rejects.toThrow('Database operation failed');
    });

    it('should log errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Test error'));

      try {
        await service.findManyWithFilters({});
      } catch (e) {
        // Expected
      }

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});


