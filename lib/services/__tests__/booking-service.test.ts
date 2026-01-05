/**
 * BookingService Tests
 * Unit tests for booking business logic
 */

import { BookingService, CreateBookingData } from '../booking.service';
import { createMockQueryResult, getNextWeekDate } from '../../__tests__/test-utils';
import { createMockBooking } from '../../__tests__/factories';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock dependent services
jest.mock('../customer.service', () => ({
  customerService: {
    findOrCreate: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+1-509-555-1234',
    }),
    updateStatistics: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../pricing.service', () => ({
  pricingService: {
    calculatePricing: jest.fn().mockResolvedValue({
      basePrice: 600,
      gratuity: 108,
      taxes: 54,
      totalPrice: 762,
      depositAmount: 200,
      finalPaymentAmount: 562,
    }),
    calculateEndTime: jest.fn().mockReturnValue('16:00'),
  },
}));

jest.mock('../vehicle-availability.service', () => ({
  vehicleAvailabilityService: {
    checkAvailability: jest.fn().mockResolvedValue({
      available: true,
      vehicle_id: 1,
      vehicle_name: 'Mercedes Sprinter',
      conflicts: [],
    }),
    createHoldBlock: jest.fn().mockResolvedValue({ id: 1 }),
    convertHoldToBooking: jest.fn().mockResolvedValue(undefined),
    releaseHoldBlock: jest.fn().mockResolvedValue(undefined),
    deleteBookingBlocks: jest.fn().mockResolvedValue(undefined),
    getAvailableSlots: jest.fn().mockResolvedValue([]),
  },
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

describe('BookingService', () => {
  let service: BookingService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new BookingService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('createBooking validation', () => {
    const getValidBookingData = (): CreateBookingData => ({
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      customerPhone: '+1-509-555-1234',
      partySize: 6,
      tourDate: getNextWeekDate(),
      startTime: '10:00',
      durationHours: 6,
      totalPrice: 850,
      depositPaid: 250,
    });

    it('should reject booking with invalid email', async () => {
      const invalidData = {
        ...getValidBookingData(),
        customerEmail: 'invalid-email',
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with party size above 50', async () => {
      const invalidData = {
        ...getValidBookingData(),
        partySize: 100,
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with party size below 1', async () => {
      const invalidData = {
        ...getValidBookingData(),
        partySize: 0,
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with negative deposit', async () => {
      const invalidData = {
        ...getValidBookingData(),
        depositPaid: -100,
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with invalid date format', async () => {
      const invalidData = {
        ...getValidBookingData(),
        tourDate: '01-15-2025',
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with invalid time format', async () => {
      const invalidData = {
        ...getValidBookingData(),
        startTime: '10:00 AM',
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with duration less than 4 hours', async () => {
      const invalidData = {
        ...getValidBookingData(),
        durationHours: 2,
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject booking with duration more than 24 hours', async () => {
      const invalidData = {
        ...getValidBookingData(),
        durationHours: 25,
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject empty customer name', async () => {
      const invalidData = {
        ...getValidBookingData(),
        customerName: '',
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });

    it('should reject phone number too short', async () => {
      const invalidData = {
        ...getValidBookingData(),
        customerPhone: '123',
      };

      await expect(service.createBooking(invalidData)).rejects.toThrow();
    });
  });

  // ============================================================================
  // Read Operation Tests
  // ============================================================================

  describe('getById', () => {
    it('should return booking when found', async () => {
      const mockBooking = createMockBooking({ id: 1 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      const result = await service.getById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should throw NotFoundError when booking not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getById(999)).rejects.toThrow('not found');
    });
  });

  describe('getByNumber', () => {
    it('should return booking when found by booking number', async () => {
      const mockBooking = createMockBooking({ booking_number: 'WWT-2025-00001' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      const result = await service.getByNumber('WWT-2025-00001');

      expect(result).toBeDefined();
      expect(result.booking_number).toBe('WWT-2025-00001');
    });

    it('should throw NotFoundError when booking number not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getByNumber('WWT-9999-99999')).rejects.toThrow();
    });
  });

  describe('getUpcomingBookings', () => {
    it('should return upcoming bookings ordered by date', async () => {
      const mockBookings = [
        createMockBooking({ tour_date: '2025-02-01', status: 'confirmed' }),
        createMockBooking({ tour_date: '2025-02-02', status: 'pending' }),
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.getUpcomingBookings(10);

      expect(result).toHaveLength(2);
      expect(result[0].tour_date).toBe('2025-02-01');
    });

    it('should respect limit parameter', async () => {
      const mockBookings = [createMockBooking()];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockBookings));

      await service.getUpcomingBookings(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });
  });

  describe('getCustomerBookings', () => {
    it('should return all bookings for a customer', async () => {
      const customerId = 123;
      const mockBookings = [
        createMockBooking({ customer_id: customerId }),
        createMockBooking({ customer_id: customerId }),
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.getCustomerBookings(customerId);

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // Update Operation Tests
  // ============================================================================

  describe('updateStatus', () => {
    it('should update status with valid transition (pending -> confirmed)', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'pending' });
      const updatedBooking = { ...mockBooking, status: 'confirmed' };

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockBooking])) // getById
        .mockResolvedValueOnce(createMockQueryResult([updatedBooking])); // update

      const result = await service.updateStatus(1, 'confirmed');

      expect(result.status).toBe('confirmed');
    });

    it('should update status with valid transition (confirmed -> completed)', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'confirmed' });
      const updatedBooking = { ...mockBooking, status: 'completed' };

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockBooking]))
        .mockResolvedValueOnce(createMockQueryResult([updatedBooking]));

      const result = await service.updateStatus(1, 'completed');

      expect(result.status).toBe('completed');
    });

    it('should update status with valid transition (pending -> cancelled)', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'pending' });
      const updatedBooking = { ...mockBooking, status: 'cancelled' };

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockBooking]))
        .mockResolvedValueOnce(createMockQueryResult([updatedBooking]));

      const result = await service.updateStatus(1, 'cancelled');

      expect(result.status).toBe('cancelled');
    });

    it('should reject invalid transition (completed -> pending)', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'completed' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      await expect(service.updateStatus(1, 'pending')).rejects.toThrow(
        'Cannot transition'
      );
    });

    it('should reject invalid transition (cancelled -> confirmed)', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'cancelled' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      await expect(service.updateStatus(1, 'confirmed')).rejects.toThrow(
        'Cannot transition'
      );
    });

    it('should reject invalid transition (completed -> cancelled)', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'completed' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      await expect(service.updateStatus(1, 'cancelled')).rejects.toThrow(
        'Cannot transition'
      );
    });

    it('should throw NotFoundError for non-existent booking', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateStatus(999, 'confirmed')).rejects.toThrow('not found');
    });
  });

  describe('confirmBooking', () => {
    it('should confirm a pending booking', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'pending' });
      const confirmedBooking = { ...mockBooking, status: 'confirmed' };

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockBooking]))
        .mockResolvedValueOnce(createMockQueryResult([confirmedBooking]));

      const result = await service.confirmBooking(1);

      expect(result.status).toBe('confirmed');
    });
  });

  // ============================================================================
  // Cancellation Tests
  // ============================================================================

  describe('cancel', () => {
    it('should throw error when cancelling already cancelled booking', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'cancelled' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      await expect(service.cancel(1)).rejects.toThrow('already cancelled');
    });

    it('should throw error when cancelling completed booking', async () => {
      const mockBooking = createMockBooking({ id: 1, status: 'completed' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      await expect(service.cancel(1)).rejects.toThrow('Cannot cancel completed');
    });

    it('should throw NotFoundError for non-existent booking', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.cancel(999)).rejects.toThrow('not found');
    });
  });

  // ============================================================================
  // Business Logic Tests
  // ============================================================================

  describe('calculateTotalPrice', () => {
    // Note: Weekend is defined as Friday (5), Saturday (6), Sunday (0) in the code
    // The code uses `new Date(date).getDay()` which can be affected by timezone
    // These tests verify the calculation logic is correct

    it('should apply weekend multiplier for Saturday', () => {
      // 2025-01-04 is Saturday
      const price = service.calculateTotalPrice(6, 6, '2025-01-04');
      // (100 * 6 + 50 * 6) * 1.2 = 900 * 1.2 = 1080
      expect(price).toBe(1080);
    });

    it('should apply weekend multiplier for Sunday', () => {
      // 2025-01-05 is Sunday
      const price = service.calculateTotalPrice(6, 6, '2025-01-05');
      expect(price).toBe(1080);
    });

    it('should not apply weekend multiplier for Tuesday', () => {
      // 2025-01-07 is Tuesday
      const price = service.calculateTotalPrice(6, 6, '2025-01-07');
      // 100 * 6 + 50 * 6 = 900
      expect(price).toBe(900);
    });

    it('should not apply weekend multiplier for Wednesday', () => {
      // 2025-01-08 is Wednesday
      const price = service.calculateTotalPrice(6, 6, '2025-01-08');
      expect(price).toBe(900);
    });

    it('should handle minimum party size', () => {
      const price = service.calculateTotalPrice(1, 4, '2025-01-07');
      // 100 * 4 + 50 * 1 = 450
      expect(price).toBe(450);
    });

    it('should handle large party size', () => {
      const price = service.calculateTotalPrice(20, 8, '2025-01-07');
      // 100 * 8 + 50 * 20 = 800 + 1000 = 1800
      expect(price).toBe(1800);
    });

    it('should handle minimum duration', () => {
      const price = service.calculateTotalPrice(4, 4, '2025-01-07');
      // 100 * 4 + 50 * 4 = 400 + 200 = 600
      expect(price).toBe(600);
    });

    it('should round to two decimal places', () => {
      // Weekend price that might produce decimals
      const price = service.calculateTotalPrice(3, 5, '2025-01-04');
      // (100 * 5 + 50 * 3) * 1.2 = 650 * 1.2 = 780
      expect(price).toBe(780);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStats = {
        total_bookings: '100',
        total_revenue: '85000.00',
        avg_party_size: '6.5',
        cancelled_count: '5',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics();

      expect(result.totalBookings).toBe(100);
      expect(result.totalRevenue).toBe(85000);
      expect(result.averagePartySize).toBe(6.5);
      expect(result.cancelledRate).toBe(0.05); // 5/100
    });

    it('should filter by date range', async () => {
      const mockStats = {
        total_bookings: '20',
        total_revenue: '17000.00',
        avg_party_size: '5',
        cancelled_count: '1',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics('2025-01-01', '2025-01-31');

      expect(result.totalBookings).toBe(20);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tour_date >='),
        expect.arrayContaining(['2025-01-01', '2025-01-31'])
      );
    });

    it('should handle zero bookings', async () => {
      const mockStats = {
        total_bookings: '0',
        total_revenue: null,
        avg_party_size: null,
        cancelled_count: '0',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics();

      expect(result.totalBookings).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averagePartySize).toBe(0);
      expect(result.cancelledRate).toBe(0);
    });

    it('should filter by start date only', async () => {
      const mockStats = {
        total_bookings: '50',
        total_revenue: '42500.00',
        avg_party_size: '6',
        cancelled_count: '2',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics('2025-01-01');

      expect(result.totalBookings).toBe(50);
    });
  });

  // ============================================================================
  // List/Filter Tests
  // ============================================================================

  describe('findManyWithFilters', () => {
    it('should return bookings with default filters', async () => {
      const mockBookings = [createMockBooking(), createMockBooking()];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '2' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.findManyWithFilters({});

      expect(result.bookings).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      const mockBookings = [createMockBooking({ status: 'confirmed' })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.findManyWithFilters({ status: 'confirmed' });

      expect(result.bookings[0].status).toBe('confirmed');
    });

    it('should filter by year and month', async () => {
      const mockBookings = [createMockBooking({ tour_date: '2025-03-15' })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.findManyWithFilters({ year: '2025', month: '03' });

      expect(result.bookings).toHaveLength(1);
    });

    it('should paginate results', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '100' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockBooking()]));

      const result = await service.findManyWithFilters({ limit: 10, offset: 20 });

      expect(result.total).toBe(100);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('LIMIT 10 OFFSET 20'),
        expect.any(Array)
      );
    });

    it('should filter by customerId', async () => {
      const customerId = 123;
      const mockBookings = [createMockBooking({ customer_id: customerId })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      await service.findManyWithFilters({ customerId });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('customer_id'),
        expect.arrayContaining([customerId])
      );
    });

    it('should filter by brandId', async () => {
      const brandId = 2;
      const mockBookings = [createMockBooking({ brand_id: brandId })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      await service.findManyWithFilters({ brandId });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('brand_id'),
        expect.arrayContaining([brandId])
      );
    });
  });

  describe('list', () => {
    it('should list bookings with various filters', async () => {
      const mockBookings = [createMockBooking()];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.list({
        year: '2025',
        status: 'confirmed',
        limit: 25,
        offset: 0,
      });

      expect(result).toBeDefined();
    });

    it('should filter by driver_id', async () => {
      const driverId = 5;
      const mockBookings = [createMockBooking({ driver_id: driverId })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      await service.list({ driver_id: driverId });

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const mockBookings = [createMockBooking()];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockBookings));

      await service.list({
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Availability Tests
  // ============================================================================

  describe('checkBookingAvailability', () => {
    it('should return availability status when available', async () => {
      const result = await service.checkBookingAvailability({
        date: getNextWeekDate(),
        startTime: '10:00',
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(true);
      expect(result.vehicleId).toBe(1);
      expect(result.vehicleName).toBe('Mercedes Sprinter');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return available slots when not available', async () => {
      const { vehicleAvailabilityService } = require('../vehicle-availability.service');
      vehicleAvailabilityService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        conflicts: ['All vehicles booked'],
      });
      vehicleAvailabilityService.getAvailableSlots.mockResolvedValueOnce([
        { start: '14:00', end: '20:00', available: true, vehicle_id: 1, vehicle_name: 'Sprinter' },
      ]);

      const result = await service.checkBookingAvailability({
        date: getNextWeekDate(),
        startTime: '10:00',
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('All vehicles booked');
      expect(result.availableSlots).toHaveLength(1);
    });
  });

  // ============================================================================
  // Status Transition Matrix Tests
  // ============================================================================

  describe('status transitions matrix', () => {
    const transitions = [
      // Valid transitions
      { from: 'pending', to: 'confirmed', shouldSucceed: true },
      { from: 'pending', to: 'cancelled', shouldSucceed: true },
      { from: 'confirmed', to: 'completed', shouldSucceed: true },
      { from: 'confirmed', to: 'cancelled', shouldSucceed: true },
      // Invalid transitions
      { from: 'completed', to: 'pending', shouldSucceed: false },
      { from: 'completed', to: 'confirmed', shouldSucceed: false },
      { from: 'completed', to: 'cancelled', shouldSucceed: false },
      { from: 'cancelled', to: 'pending', shouldSucceed: false },
      { from: 'cancelled', to: 'confirmed', shouldSucceed: false },
      { from: 'cancelled', to: 'completed', shouldSucceed: false },
      { from: 'pending', to: 'completed', shouldSucceed: false },
    ];

    transitions.forEach(({ from, to, shouldSucceed }) => {
      it(`${shouldSucceed ? 'allows' : 'rejects'} transition from ${from} to ${to}`, async () => {
        const mockBooking = createMockBooking({ id: 1, status: from });
        const updatedBooking = { ...mockBooking, status: to };

        if (shouldSucceed) {
          mockQuery
            .mockResolvedValueOnce(createMockQueryResult([mockBooking]))
            .mockResolvedValueOnce(createMockQueryResult([updatedBooking]));

          const result = await service.updateStatus(1, to as 'pending' | 'confirmed' | 'completed' | 'cancelled');
          expect(result.status).toBe(to);
        } else {
          mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));
          await expect(
            service.updateStatus(1, to as 'pending' | 'confirmed' | 'completed' | 'cancelled')
          ).rejects.toThrow('Cannot transition');
        }
      });
    });
  });
});
