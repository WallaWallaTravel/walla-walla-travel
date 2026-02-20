/**
 * BookingCoreService Tests
 *
 * Unit tests for core booking CRUD operations including:
 * - getById (with optional driver include)
 * - getByNumber
 * - getCustomerBookings
 * - getUpcomingBookings
 * - list (with filters and pagination)
 * - createBooking (with transaction, advisory lock, capacity check)
 * - updateById
 * - updateStatus (with status transition validation)
 * - confirmBooking
 * - updateBooking (alias)
 * - cancelBooking (with deadline enforcement)
 * - calculateTotalPrice (pure business logic)
 * - calculateEndTime (pure helper)
 * - generateBookingNumber (sequence-based)
 * - validateStatusTransition
 * - getOrCreateCustomer
 * - checkDateAvailability
 * - getStatistics
 */

import { createMockQueryResult, getNextWeekDate } from '../../../__tests__/test-utils';

// ============================================================================
// Mocks - must be declared before any imports that use them
// ============================================================================

// Mock the db module (required by BaseService)
jest.mock('../../../db', () => ({
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
jest.mock('../../../db/transaction', () => ({
  withTransaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
    callback(jest.fn())
  ),
}));

// Mock db-helpers (withTransaction used by createBooking via withClientTransaction)
jest.mock('../../../db-helpers', () => ({
  withTransaction: jest.fn(),
}));

// Mock logger
jest.mock('../../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock error logger
jest.mock('../../../monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

// Mock CRM sync service
jest.mock('../../crm-sync.service', () => ({
  crmSyncService: {
    onBookingStatusChange: jest.fn().mockResolvedValue(undefined),
    getOrCreateContactForCustomer: jest.fn().mockResolvedValue(null),
  },
}));

// Mock CRM task automation service
jest.mock('../../crm-task-automation.service', () => ({
  crmTaskAutomationService: {
    onTourCompleted: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Google Calendar sync service
jest.mock('../../google-calendar-sync.service', () => ({
  googleCalendarSyncService: {
    syncBooking: jest.fn().mockResolvedValue(undefined),
  },
}));

// ============================================================================
// Import service under test AFTER mocks are declared
// ============================================================================

import { BookingCoreService } from '../core.service';
import { crmSyncService } from '../../crm-sync.service';
import { crmTaskAutomationService } from '../../crm-task-automation.service';
import { googleCalendarSyncService } from '../../google-calendar-sync.service';
import { withTransaction as withClientTransaction } from '../../../db-helpers';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/api/middleware/error-handler';
import { VALID_STATUS_TRANSITIONS, BookingStatus } from '../types';

// ============================================================================
// Utility: flush pending microtasks (for async .catch handlers)
// ============================================================================

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================================
// Tests
// ============================================================================

describe('BookingCoreService', () => {
  let service: BookingCoreService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    service = new BookingCoreService();
    mockQuery = require('../../../db').query as jest.Mock;

    // Re-establish withTransaction mock for BaseService (db/transaction)
    const { withTransaction: mockWithTransaction } = require('../../../db/transaction');
    (mockWithTransaction as jest.Mock).mockImplementation(
      (callback: (client: unknown) => Promise<unknown>) => callback(jest.fn())
    );

    // Re-establish async service mocks (non-blocking calls)
    (crmSyncService.onBookingStatusChange as jest.Mock).mockResolvedValue(undefined);
    (crmSyncService.getOrCreateContactForCustomer as jest.Mock).mockResolvedValue(null);
    (crmTaskAutomationService.onTourCompleted as jest.Mock).mockResolvedValue(undefined);
    (googleCalendarSyncService.syncBooking as jest.Mock).mockResolvedValue(undefined);
  });

  // ==========================================================================
  // getById
  // ==========================================================================

  describe('getById', () => {
    const mockBooking = {
      id: 1,
      booking_number: 'WWT-2026-00001',
      customer_id: 10,
      status: 'confirmed',
      tour_date: getNextWeekDate(),
      customer: { id: 10, name: 'Jane Doe', email: 'jane@example.com', phone: '555-1234' },
    };

    it('should return booking with customer data', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      const result = await service.getById(1);

      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.booking_number).toBe('WWT-2026-00001');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('SELECT');
      expect(sql).toContain('json_build_object');
      expect(sql).toContain('customers');
    });

    it('should include driver data when include contains "driver"', async () => {
      const bookingWithDriver = {
        ...mockBooking,
        driver: { id: 5, name: 'Driver Bob' },
      };
      mockQuery.mockResolvedValueOnce(createMockQueryResult([bookingWithDriver]));

      const result = await service.getById(1, ['driver']);

      expect(result).toBeDefined();
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('LEFT JOIN users d ON b.driver_id = d.id');
    });

    it('should throw NotFoundError when booking does not exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });

    it('should pass booking id as query parameter', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      await service.getById(42);

      expect(mockQuery.mock.calls[0][1]).toEqual([42]);
    });
  });

  // ==========================================================================
  // getByNumber
  // ==========================================================================

  describe('getByNumber', () => {
    it('should return booking by booking number', async () => {
      const mockBooking = {
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'confirmed',
      };
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      const result = await service.getByNumber('WWT-2026-00001');

      expect(result.booking_number).toBe('WWT-2026-00001');
      expect(mockQuery.mock.calls[0][1]).toEqual(['WWT-2026-00001']);
    });

    it('should throw NotFoundError when booking number does not exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getByNumber('WWT-9999-00001')).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // getCustomerBookings
  // ==========================================================================

  describe('getCustomerBookings', () => {
    it('should return bookings for a customer ordered by created_at DESC', async () => {
      const mockBookings = [
        { id: 2, customer_id: 10, booking_number: 'WWT-2026-00002' },
        { id: 1, customer_id: 10, booking_number: 'WWT-2026-00001' },
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.getCustomerBookings(10);

      expect(result).toHaveLength(2);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('customer_id = $1');
      expect(sql).toContain('created_at DESC');
      expect(mockQuery.mock.calls[0][1]).toEqual([10]);
    });

    it('should return empty array when customer has no bookings', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getCustomerBookings(999);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getUpcomingBookings
  // ==========================================================================

  describe('getUpcomingBookings', () => {
    it('should return upcoming bookings with default limit', async () => {
      const mockBookings = [
        { id: 1, tour_date: getNextWeekDate(), status: 'confirmed' },
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockBookings));

      const result = await service.getUpcomingBookings();

      expect(result).toHaveLength(1);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('tour_date >= CURRENT_DATE');
      expect(sql).toContain("status IN ('pending', 'confirmed')");
      expect(sql).toContain('ORDER BY tour_date ASC');
      expect(mockQuery.mock.calls[0][1]).toEqual([10]); // default limit
    });

    it('should respect custom limit parameter', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getUpcomingBookings(5);

      expect(mockQuery.mock.calls[0][1]).toEqual([5]);
    });

    it('should return empty array when no upcoming bookings exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getUpcomingBookings();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // list
  // ==========================================================================

  describe('list', () => {
    beforeEach(() => {
      // paginate calls two queries: COUNT and data
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '3' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([
        { id: 1, tour_date: '2026-03-01', customer_name: 'Alice' },
        { id: 2, tour_date: '2026-03-02', customer_name: 'Bob' },
        { id: 3, tour_date: '2026-03-03', customer_name: 'Charlie' },
      ]));
    });

    it('should return paginated results with no filters', async () => {
      const result = await service.list({});

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should apply year filter', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ year: '2026' });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('EXTRACT(YEAR FROM b.tour_date)');
      expect(mockQuery.mock.calls[0][1]).toEqual([2026]);
    });

    it('should apply month filter', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ month: '3' });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('EXTRACT(MONTH FROM b.tour_date)');
      expect(mockQuery.mock.calls[0][1]).toEqual([3]);
    });

    it('should apply status filter', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ status: 'confirmed' });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('b.status = $1');
      expect(mockQuery.mock.calls[0][1]).toEqual(['confirmed']);
    });

    it('should apply customer_id filter', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ customer_id: 42 });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('b.customer_id = $1');
      expect(mockQuery.mock.calls[0][1]).toEqual([42]);
    });

    it('should apply brand_id filter', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ brand_id: 2 });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('b.brand_id = $1');
    });

    it('should apply date range filters', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ start_date: '2026-01-01', end_date: '2026-12-31' });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('b.tour_date >= $1');
      expect(countSql).toContain('b.tour_date <= $2');
      expect(mockQuery.mock.calls[0][1]).toEqual(['2026-01-01', '2026-12-31']);
    });

    it('should apply driver_id filter', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ driver_id: 7 });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('b.driver_id = $1');
    });

    it('should apply multiple filters together', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({ year: '2026', status: 'confirmed', brand_id: 2 });

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('EXTRACT(YEAR FROM b.tour_date) = $1');
      expect(countSql).toContain('b.status = $2');
      expect(countSql).toContain('b.brand_id = $3');
    });

    it('should use custom limit and offset', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '100' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      const result = await service.list({ limit: 10, offset: 20 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should join customers, users (driver), and brands tables', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await service.list({});

      const countSql: string = mockQuery.mock.calls[0][0];
      expect(countSql).toContain('LEFT JOIN customers c');
      expect(countSql).toContain('LEFT JOIN users d');
      expect(countSql).toContain('LEFT JOIN brands br');
    });
  });

  // ==========================================================================
  // createBooking
  // ==========================================================================

  describe('createBooking', () => {
    let mockClientQuery: jest.Mock;

    const validBookingData = {
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '509-555-1234',
      partySize: 6,
      tourDate: getNextWeekDate(),
      startTime: '10:00',
      durationHours: 6,
      totalPrice: 950,
      depositPaid: 475,
    };

    beforeEach(() => {
      mockClientQuery = jest.fn();

      // Set up withClientTransaction to call the callback with a mock client
      (withClientTransaction as jest.Mock).mockImplementation(
        async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
          return callback({ query: mockClientQuery });
        }
      );
    });

    it('should create a booking successfully with existing customer', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '10' }]));
      // existing customer lookup
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // update customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // create sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // nextval
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '42' }]));
      // insert booking
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00042',
        customer_id: 5,
        status: 'pending',
      }]));

      const result = await service.createBooking(validBookingData);

      expect(result.id).toBe(1);
      expect(result.booking_number).toBe('WWT-2026-00042');
    });

    it('should create a new customer when one does not exist', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '0' }]));
      // existing customer lookup - not found
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // create customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 99 }]));
      // create sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // nextval
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));
      // insert booking
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        customer_id: 99,
        status: 'pending',
      }]));

      const result = await service.createBooking(validBookingData);

      expect(result.customer_id).toBe(99);
      // Verify the INSERT INTO customers was called
      const insertCustomerCall = mockClientQuery.mock.calls[3];
      expect(insertCustomerCall[0]).toContain('INSERT INTO customers');
    });

    it('should throw ConflictError when capacity is exceeded', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check - already at 46 guests, requesting 6 more (>50)
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '46' }]));

      await expect(service.createBooking(validBookingData)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError when tour date is in the past', async () => {
      const pastBookingData = {
        ...validBookingData,
        tourDate: '2020-01-01',
      };

      await expect(service.createBooking(pastBookingData)).rejects.toThrow(ValidationError);
    });

    it('should acquire advisory lock on the tour date', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '0' }]));
      // customer lookup
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // update customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));
      // insert booking
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, booking_number: 'WWT-2026-00001' }]));

      await service.createBooking(validBookingData);

      const lockCall = mockClientQuery.mock.calls[0];
      expect(lockCall[0]).toContain('pg_advisory_xact_lock');
      expect(lockCall[1]).toEqual([validBookingData.tourDate]);
    });

    it('should calculate balance due correctly', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '0' }]));
      // customer lookup
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // update customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));
      // insert booking
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, booking_number: 'WWT-2026-00001' }]));

      await service.createBooking(validBookingData);

      // The insert booking call is the last one (index 6)
      const insertCall = mockClientQuery.mock.calls[6];
      const insertValues = insertCall[1] as unknown[];
      // balanceDue = totalPrice - depositPaid = 950 - 475 = 475
      expect(insertValues).toContain(475); // balance due (final_payment_amount)
    });

    it('should use withClientTransaction (db-helpers) for the operation', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '0' }]));
      // customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));
      // insert
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, booking_number: 'WWT-2026-00001' }]));

      await service.createBooking(validBookingData);

      expect(withClientTransaction).toHaveBeenCalledTimes(1);
      expect(withClientTransaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should set brand_id to null when not provided', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '0' }]));
      // customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));
      // insert
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, booking_number: 'WWT-2026-00001' }]));

      await service.createBooking(validBookingData);

      const insertValues = mockClientQuery.mock.calls[6][1] as unknown[];
      // Last value is brand_id, should be null (no brandId in data)
      expect(insertValues[insertValues.length - 1]).toBeNull();
    });

    it('should set brand_id when provided', async () => {
      // advisory lock
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // capacity check
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '0' }]));
      // customer
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // sequence
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));
      // insert
      mockClientQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, booking_number: 'WWT-2026-00001' }]));

      await service.createBooking({ ...validBookingData, brandId: 3 });

      const insertValues = mockClientQuery.mock.calls[6][1] as unknown[];
      expect(insertValues[insertValues.length - 1]).toBe(3);
    });
  });

  // ==========================================================================
  // updateById
  // ==========================================================================

  describe('updateById', () => {
    it('should update booking by id', async () => {
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'confirmed',
        party_size: 8,
      }]));

      const result = await service.updateById(1, { party_size: 8 });

      expect(result.party_size).toBe(8);
    });

    it('should throw NotFoundError when booking does not exist', async () => {
      // exists check - false
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: false }]));

      await expect(service.updateById(999, { party_size: 8 })).rejects.toThrow(NotFoundError);
    });

    it('should throw Error when update returns no rows', async () => {
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update returns nothing
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateById(1, { party_size: 8 })).rejects.toThrow('Failed to update booking');
    });

    it('should trigger Google Calendar sync (non-blocking)', async () => {
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'confirmed' }]));

      await service.updateById(1, { party_size: 8 });
      await flushPromises();

      expect(googleCalendarSyncService.syncBooking).toHaveBeenCalledWith(1);
    });

    it('should not block when Google Calendar sync fails', async () => {
      (googleCalendarSyncService.syncBooking as jest.Mock).mockRejectedValue(
        new Error('Calendar API error')
      );
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'confirmed' }]));

      const result = await service.updateById(1, { party_size: 8 });

      expect(result.id).toBe(1);
      await flushPromises();
    });
  });

  // ==========================================================================
  // updateStatus
  // ==========================================================================

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      // getById query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'pending',
        customer_id: 10,
      }]));
      // update query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'confirmed',
      }]));

      const result = await service.updateStatus(1, 'confirmed');

      expect(result.status).toBe('confirmed');
    });

    it('should throw ValidationError for invalid status transition', async () => {
      // getById query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'completed',
        customer_id: 10,
      }]));

      await expect(service.updateStatus(1, 'confirmed')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when booking does not exist', async () => {
      // getById returns nothing
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateStatus(999, 'confirmed')).rejects.toThrow(NotFoundError);
    });

    it('should sync status change to CRM asynchronously', async () => {
      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'pending',
        customer_id: 10,
      }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'confirmed' }]));

      await service.updateStatus(1, 'confirmed');
      await flushPromises();

      expect(crmSyncService.onBookingStatusChange).toHaveBeenCalledWith(1, 'confirmed');
    });

    it('should sync status change to Google Calendar asynchronously', async () => {
      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'pending',
        customer_id: 10,
      }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'confirmed' }]));

      await service.updateStatus(1, 'confirmed');
      await flushPromises();

      expect(googleCalendarSyncService.syncBooking).toHaveBeenCalledWith(1);
    });

    it('should not block on CRM sync failure', async () => {
      (crmSyncService.onBookingStatusChange as jest.Mock).mockRejectedValue(
        new Error('CRM down')
      );
      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'pending',
        customer_id: 10,
        booking_number: 'WWT-2026-00001',
      }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'confirmed' }]));

      const result = await service.updateStatus(1, 'confirmed');

      expect(result.status).toBe('confirmed');
      await flushPromises();
    });

    it('should create post-tour follow-up task when status is completed', async () => {
      const mockContact = { id: 200, name: 'Jane Doe' };
      (crmSyncService.getOrCreateContactForCustomer as jest.Mock).mockResolvedValue(mockContact);

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'confirmed',
        customer_id: 10,
        customer_name: 'Jane Doe',
      }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'completed' }]));

      await service.updateStatus(1, 'completed');
      await flushPromises();

      expect(crmSyncService.getOrCreateContactForCustomer).toHaveBeenCalledWith(10);
      expect(crmTaskAutomationService.onTourCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 200,
          bookingNumber: 'WWT-2026-00001',
          customerName: 'Jane Doe',
        })
      );
    });

    it('should skip follow-up task when contact is null', async () => {
      (crmSyncService.getOrCreateContactForCustomer as jest.Mock).mockResolvedValue(null);

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'confirmed',
        customer_id: 10,
      }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'completed' }]));

      await service.updateStatus(1, 'completed');
      await flushPromises();

      expect(crmTaskAutomationService.onTourCompleted).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // confirmBooking
  // ==========================================================================

  describe('confirmBooking', () => {
    it('should delegate to updateStatus with confirmed status', async () => {
      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'pending',
        customer_id: 10,
      }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'confirmed' }]));

      const result = await service.confirmBooking(1);

      expect(result.status).toBe('confirmed');
    });
  });

  // ==========================================================================
  // updateBooking (alias for updateById)
  // ==========================================================================

  describe('updateBooking', () => {
    it('should delegate to updateById', async () => {
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        special_requests: 'VIP treatment',
      }]));

      const result = await service.updateBooking(1, { special_requests: 'VIP treatment' });

      expect(result.special_requests).toBe('VIP treatment');
    });
  });

  // ==========================================================================
  // cancelBooking
  // ==========================================================================

  describe('cancelBooking', () => {
    it('should cancel booking successfully when more than 24h before tour', async () => {
      const futureTourDate = new Date();
      futureTourDate.setDate(futureTourDate.getDate() + 7);

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'confirmed',
        tour_date: futureTourDate.toISOString(),
        customer_id: 10,
      }]));
      // exists check (from updateById)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update (from updateById)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'cancelled',
        cancellation_reason: 'Changed plans',
      }]));
      // timeline event INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      const result = await service.cancelBooking(1, 'Changed plans');

      expect(result.status).toBe('cancelled');
    });

    it('should throw ConflictError when booking is already cancelled', async () => {
      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'cancelled',
        tour_date: getNextWeekDate(),
        customer_id: 10,
        booking_number: 'WWT-2026-00001',
      }]));

      await expect(service.cancelBooking(1)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when booking is completed', async () => {
      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'completed',
        tour_date: getNextWeekDate(),
        customer_id: 10,
        booking_number: 'WWT-2026-00001',
      }]));

      await expect(service.cancelBooking(1)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when cancellation deadline has passed (less than 24h)', async () => {
      const soonTourDate = new Date();
      soonTourDate.setHours(soonTourDate.getHours() + 12); // Only 12 hours away

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'confirmed',
        tour_date: soonTourDate.toISOString(),
        customer_id: 10,
        booking_number: 'WWT-2026-00001',
      }]));

      await expect(service.cancelBooking(1)).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError when booking does not exist', async () => {
      // getById returns nothing
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.cancelBooking(999)).rejects.toThrow(NotFoundError);
    });

    it('should log timeline event on cancellation', async () => {
      const futureTourDate = new Date();
      futureTourDate.setDate(futureTourDate.getDate() + 7);

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        booking_number: 'WWT-2026-00001',
        status: 'confirmed',
        tour_date: futureTourDate.toISOString(),
        customer_id: 10,
      }]));
      // exists check (updateById)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update (updateById)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'cancelled' }]));
      // timeline INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await service.cancelBooking(1, 'No longer needed');

      // The timeline query is the 4th call (index 3)
      const timelineCall = mockQuery.mock.calls[3];
      const timelineSql: string = timelineCall[0];
      expect(timelineSql).toContain('INSERT INTO booking_timeline');
      const timelineValues = timelineCall[1] as unknown[];
      expect(timelineValues[0]).toBe(1); // booking_id
      expect(timelineValues[1]).toBe('booking_cancelled'); // event_type
      expect(timelineValues[2]).toBe('Booking cancelled');
      const eventData = JSON.parse(timelineValues[3] as string);
      expect(eventData.reason).toBe('No longer needed');
    });

    it('should sync cancellation to CRM asynchronously', async () => {
      const futureTourDate = new Date();
      futureTourDate.setDate(futureTourDate.getDate() + 7);

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'confirmed',
        tour_date: futureTourDate.toISOString(),
        customer_id: 10,
        booking_number: 'WWT-2026-00001',
      }]));
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'cancelled' }]));
      // timeline
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await service.cancelBooking(1);
      await flushPromises();

      expect(crmSyncService.onBookingStatusChange).toHaveBeenCalledWith(1, 'cancelled');
    });

    it('should sync cancellation to Google Calendar asynchronously', async () => {
      const futureTourDate = new Date();
      futureTourDate.setDate(futureTourDate.getDate() + 7);

      // getById
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 1,
        status: 'confirmed',
        tour_date: futureTourDate.toISOString(),
        customer_id: 10,
        booking_number: 'WWT-2026-00001',
      }]));
      // exists check
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]));
      // update
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1, status: 'cancelled' }]));
      // timeline
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await service.cancelBooking(1);
      await flushPromises();

      expect(googleCalendarSyncService.syncBooking).toHaveBeenCalledWith(1);
    });
  });

  // ==========================================================================
  // calculateTotalPrice (pure function)
  // ==========================================================================

  describe('calculateTotalPrice', () => {
    it('should calculate price for weekday booking', () => {
      // Use a known Wednesday: 2026-02-25
      const result = service.calculateTotalPrice(4, 6, '2026-02-25');

      // baseRate=100/hr, perPerson=50
      // (100*6) + (50*4) = 600 + 200 = 800
      // Wednesday is not a weekend -> multiplier = 1.0
      // total = 800 * 1.0 = 800
      expect(result).toBe(800);
    });

    it('should apply weekend multiplier for Saturday', () => {
      // Use a known Saturday: 2026-02-22 (getDay() === 6 in UTC-based parse)
      const result = service.calculateTotalPrice(4, 6, '2026-02-22');

      // (100*6) + (50*4) = 800
      // Saturday is day 6 -> weekend multiplier = 1.2
      // total = 800 * 1.2 = 960
      expect(result).toBe(960);
    });

    it('should apply weekend multiplier for Sunday', () => {
      // Use a known Sunday: 2026-02-23 (getDay() === 0 in UTC-based parse)
      const result = service.calculateTotalPrice(4, 6, '2026-02-23');

      // Sunday is day 0 -> weekend multiplier = 1.2
      // total = 800 * 1.2 = 960
      expect(result).toBe(960);
    });

    it('should apply weekend multiplier for Friday', () => {
      // Use a known Friday: 2026-03-07 (getDay() === 5)
      const result = service.calculateTotalPrice(4, 6, '2026-03-07');

      // Friday is day 5 -> weekend multiplier = 1.2
      // (100*6) + (50*4) = 800 * 1.2 = 960
      expect(result).toBe(960);
    });

    it('should round result to 2 decimal places', () => {
      // Force a calculation that could produce floating point issues
      const result = service.calculateTotalPrice(3, 5, '2026-02-25');
      // (100*5) + (50*3) = 650 * 1.0 = 650
      expect(result).toBe(650);
      // Verify it's properly rounded
      expect(result).toBe(Math.round(result * 100) / 100);
    });

    it('should handle minimum party size', () => {
      const result = service.calculateTotalPrice(1, 6, '2026-02-25');
      // (100*6) + (50*1) = 650 * 1.0 = 650
      expect(result).toBe(650);
    });
  });

  // ==========================================================================
  // calculateEndTime
  // ==========================================================================

  describe('calculateEndTime', () => {
    it('should calculate end time correctly', () => {
      expect(service.calculateEndTime('10:00', 6)).toBe('16:00');
    });

    it('should handle minutes overflow', () => {
      expect(service.calculateEndTime('10:30', 2.5)).toBe('13:00');
    });

    it('should handle single-digit hours with padding', () => {
      expect(service.calculateEndTime('06:00', 2)).toBe('08:00');
    });

    it('should handle times past midnight', () => {
      expect(service.calculateEndTime('22:00', 4)).toBe('26:00');
    });

    it('should handle zero duration', () => {
      expect(service.calculateEndTime('10:00', 0)).toBe('10:00');
    });
  });

  // ==========================================================================
  // generateBookingNumber
  // ==========================================================================

  describe('generateBookingNumber', () => {
    it('should generate booking number in WWT-YYYY-NNNNN format', async () => {
      // CREATE SEQUENCE query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // nextval query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));

      const result = await service.generateBookingNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`WWT-${year}-00001`);
    });

    it('should pad sequence number to 5 digits', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '42' }]));

      const result = await service.generateBookingNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`WWT-${year}-00042`);
    });

    it('should handle large sequence numbers', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '99999' }]));

      const result = await service.generateBookingNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`WWT-${year}-99999`);
    });

    it('should create year-specific sequence', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ seq: '1' }]));

      await service.generateBookingNumber();

      const year = new Date().getFullYear();
      const createSeqSql: string = mockQuery.mock.calls[0][0];
      expect(createSeqSql).toContain(`booking_number_seq_${year}`);
    });
  });

  // ==========================================================================
  // validateStatusTransition
  // ==========================================================================

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      // Test all valid transitions from the VALID_STATUS_TRANSITIONS map
      const validTransitions: Array<[BookingStatus, BookingStatus]> = [
        ['draft', 'pending'],
        ['draft', 'confirmed'],
        ['draft', 'cancelled'],
        ['pending', 'confirmed'],
        ['pending', 'cancelled'],
        ['confirmed', 'completed'],
        ['confirmed', 'cancelled'],
      ];

      for (const [from, to] of validTransitions) {
        expect(() => service.validateStatusTransition(from, to)).not.toThrow();
      }
    });

    it('should throw ValidationError for invalid transitions', () => {
      const invalidTransitions: Array<[BookingStatus, BookingStatus]> = [
        ['completed', 'confirmed'],
        ['completed', 'cancelled'],
        ['completed', 'pending'],
        ['cancelled', 'confirmed'],
        ['cancelled', 'pending'],
        ['cancelled', 'completed'],
        ['pending', 'draft'],
        ['confirmed', 'pending'],
        ['confirmed', 'draft'],
      ];

      for (const [from, to] of invalidTransitions) {
        expect(() => service.validateStatusTransition(from, to)).toThrow(ValidationError);
      }
    });

    it('should include current and target status in error message', () => {
      try {
        service.validateStatusTransition('completed', 'confirmed');
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('completed');
        expect((error as Error).message).toContain('confirmed');
      }
    });
  });

  // ==========================================================================
  // getOrCreateCustomer
  // ==========================================================================

  describe('getOrCreateCustomer', () => {
    const customerData = {
      email: 'jane@example.com',
      name: 'Jane Doe',
      phone: '509-555-1234',
    };

    it('should return existing customer id and update info', async () => {
      // SELECT existing customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 42 }]));
      // UPDATE customer info
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      const result = await service.getOrCreateCustomer(customerData);

      expect(result).toBe(42);
      const updateSql: string = mockQuery.mock.calls[1][0];
      expect(updateSql).toContain('UPDATE customers');
    });

    it('should create new customer when not found', async () => {
      // SELECT - not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // INSERT new customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 99 }]));

      const result = await service.getOrCreateCustomer(customerData);

      expect(result).toBe(99);
      const insertSql: string = mockQuery.mock.calls[1][0];
      expect(insertSql).toContain('INSERT INTO customers');
    });

    it('should use case-insensitive email lookup', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 42 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await service.getOrCreateCustomer(customerData);

      const selectSql: string = mockQuery.mock.calls[0][0];
      expect(selectSql).toContain('LOWER(email) = LOWER($1)');
    });
  });

  // ==========================================================================
  // checkDateAvailability
  // ==========================================================================

  describe('checkDateAvailability', () => {
    it('should not throw when capacity is available', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '20' }]));

      await expect(
        service.checkDateAvailability(getNextWeekDate(), 6)
      ).resolves.toBeUndefined();
    });

    it('should throw ConflictError when capacity is exceeded', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '48' }]));

      await expect(
        service.checkDateAvailability(getNextWeekDate(), 6)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when exactly at max capacity', async () => {
      // 50 existing + 1 more = 51 > 50
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '50' }]));

      await expect(
        service.checkDateAvailability(getNextWeekDate(), 1)
      ).rejects.toThrow(ConflictError);
    });

    it('should allow booking when exactly at max capacity boundary', async () => {
      // 44 existing + 6 = 50 = exactly max capacity, should be OK
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '44' }]));

      await expect(
        service.checkDateAvailability(getNextWeekDate(), 6)
      ).resolves.toBeUndefined();
    });

    it('should throw ValidationError when date is in the past', async () => {
      await expect(
        service.checkDateAvailability('2020-01-01', 6)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle null party size from database (no existing bookings)', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: null }]));

      await expect(
        service.checkDateAvailability(getNextWeekDate(), 6)
      ).resolves.toBeUndefined();
    });

    it('should check only pending and confirmed bookings for capacity', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ total_party_size: '10' }]));

      await service.checkDateAvailability(getNextWeekDate(), 6);

      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain("status IN ('pending', 'confirmed')");
    });
  });

  // ==========================================================================
  // getStatistics
  // ==========================================================================

  describe('getStatistics', () => {
    it('should return statistics without date filters', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '100',
        total_revenue: '85000.00',
        avg_party_size: '6.5',
        cancelled_count: '10',
      }]));

      const result = await service.getStatistics();

      expect(result.totalBookings).toBe(100);
      expect(result.totalRevenue).toBe(85000);
      expect(result.averagePartySize).toBe(6.5);
      expect(result.cancelledRate).toBeCloseTo(0.1);
    });

    it('should apply start date filter', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '50',
        total_revenue: '42500.00',
        avg_party_size: '7',
        cancelled_count: '5',
      }]));

      await service.getStatistics('2026-01-01');

      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('tour_date >= $1');
      expect(mockQuery.mock.calls[0][1]).toEqual(['2026-01-01']);
    });

    it('should apply end date filter', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '50',
        total_revenue: '42500.00',
        avg_party_size: '7',
        cancelled_count: '5',
      }]));

      await service.getStatistics(undefined, '2026-12-31');

      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('tour_date <= $1');
      expect(mockQuery.mock.calls[0][1]).toEqual(['2026-12-31']);
    });

    it('should apply both date filters', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '25',
        total_revenue: '21250.00',
        avg_party_size: '5',
        cancelled_count: '2',
      }]));

      await service.getStatistics('2026-01-01', '2026-06-30');

      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('tour_date >= $1');
      expect(sql).toContain('tour_date <= $2');
      expect(mockQuery.mock.calls[0][1]).toEqual(['2026-01-01', '2026-06-30']);
    });

    it('should handle zero bookings', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '0',
        total_revenue: null,
        avg_party_size: null,
        cancelled_count: '0',
      }]));

      const result = await service.getStatistics();

      expect(result.totalBookings).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averagePartySize).toBe(0);
      expect(result.cancelledRate).toBe(0);
    });

    it('should calculate cancelled rate correctly', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        total_bookings: '20',
        total_revenue: '17000',
        avg_party_size: '8',
        cancelled_count: '5',
      }]));

      const result = await service.getStatistics();

      expect(result.cancelledRate).toBe(0.25); // 5/20
    });
  });

  // ==========================================================================
  // Error propagation
  // ==========================================================================

  describe('error propagation', () => {
    it('should propagate database errors from query methods', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.getByNumber('WWT-2026-00001')).rejects.toThrow('Connection refused');
    });

    it('should propagate database errors from getUpcomingBookings', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Timeout'));

      await expect(service.getUpcomingBookings()).rejects.toThrow('Timeout');
    });

    it('should propagate database errors from getStatistics', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      await expect(service.getStatistics()).rejects.toThrow('Query failed');
    });
  });
});
