/**
 * BookingService Tests
 * Unit tests for booking business logic
 */

import { BookingService } from '../booking-service';
import { createMockPool, createMockQueryResult } from '../../__tests__/test-utils';
import { 
  createMockBooking, 
  createMockBookingWithRelations,
  createMockCustomer 
} from '../../__tests__/factories';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: createMockPool(),
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

    it('should filter by date range', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '5' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockBooking()]));

      await service.findManyWithFilters({
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      });

      // Verify SQL includes date filters
      const sqlCall = mockQuery.mock.calls[1][0];
      expect(sqlCall).toContain('b.tour_date >= $');
      expect(sqlCall).toContain('b.tour_date <= $');
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

    it('should throw error when booking not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getFullBookingDetails(999)).rejects.toThrow('not found');
    });
  });

  describe('getStatistics', () => {
    it('should return booking statistics', async () => {
      const mockStats = {
        total_bookings: '50',
        confirmed_bookings: '40',
        cancelled_bookings: '5',
        pending_bookings: '5',
        total_revenue: '42500.00',
        average_booking_value: '850.00',
        average_party_size: '6.5',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics({});

      expect(result.totalBookings).toBe(50);
      expect(result.confirmedBookings).toBe(40);
      expect(result.totalRevenue).toBe(42500);
      expect(result.averageBookingValue).toBe(850);
      expect(result.averagePartySize).toBe(6.5);
    });

    it('should filter statistics by date range', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '10',
        confirmed_bookings: '8',
        cancelled_bookings: '1',
        pending_bookings: '1',
        total_revenue: '8500.00',
        average_booking_value: '850.00',
        average_party_size: '6.0',
      }]));

      await service.getStatistics({
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      });

      // Verify SQL includes date filters
      const sqlCall = mockQuery.mock.calls[0][0];
      expect(sqlCall).toContain('tour_date >= $');
      expect(sqlCall).toContain('tour_date <= $');
    });
  });

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      const originalBooking = createMockBooking({ party_size: 6 });
      const updatedBooking = { ...originalBooking, party_size: 8 };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedBooking]));

      const result = await service.updateBooking(123, { partySize: 8 });

      expect(result).toBeDefined();
      expect(result.party_size).toBe(8);
    });

    it('should throw error when booking not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateBooking(999, { partySize: 8 })).rejects.toThrow('not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.findManyWithFilters({})).rejects.toThrow('Database connection failed');
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


