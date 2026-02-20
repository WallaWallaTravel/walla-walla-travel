/**
 * BookingAvailabilityService Tests
 *
 * Tests for booking availability checks, vehicle availability integration,
 * transactional booking creation with hold blocks, and cancellation with
 * vehicle release.
 */

import { BookingAvailabilityService } from '../availability.service';
import { createMockQueryResult } from '../../../__tests__/test-utils';
import { ConflictError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Mocks
// ============================================================================

// Mock the db module
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
  withTransaction: jest.fn((callback: (client: unknown) => unknown) =>
    callback(jest.fn().mockResolvedValue(createMockQueryResult([])))
  ),
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

// Mock vehicle availability service
jest.mock('../../vehicle-availability.service', () => ({
  vehicleAvailabilityService: {
    checkAvailability: jest.fn(),
    getAvailableSlots: jest.fn(),
    createHoldBlock: jest.fn(),
    convertHoldToBooking: jest.fn(),
    releaseHoldBlock: jest.fn(),
    deleteBookingBlocks: jest.fn(),
  },
}));

// Mock booking core service
jest.mock('../core.service', () => ({
  bookingCoreService: {
    calculateEndTime: jest.fn(),
    getOrCreateCustomer: jest.fn(),
    generateBookingNumber: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

// ============================================================================
// Imports after mocks
// ============================================================================

import { vehicleAvailabilityService } from '../../vehicle-availability.service';
import { bookingCoreService } from '../core.service';
import { withTransaction } from '../../../db/transaction';

// Cast mocks for type safety
const mockVehicleService = vehicleAvailabilityService as jest.Mocked<
  typeof vehicleAvailabilityService
>;
const mockCoreService = bookingCoreService as jest.Mocked<
  typeof bookingCoreService
>;
const mockWithTransaction = withTransaction as jest.Mock;

// ============================================================================
// Test Suite
// ============================================================================

describe('BookingAvailabilityService', () => {
  let service: BookingAvailabilityService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    service = new BookingAvailabilityService();
    mockQuery = require('../../../db').query as jest.Mock;

    // Re-establish withTransaction mock after resetAllMocks
    mockWithTransaction.mockImplementation(
      (callback: (client: unknown) => unknown) =>
        callback(jest.fn().mockResolvedValue(createMockQueryResult([])))
    );
  });

  // ============================================================================
  // checkBookingAvailability
  // ============================================================================

  describe('checkBookingAvailability', () => {
    const defaultParams = {
      date: '2026-06-15',
      startTime: '10:00',
      durationHours: 6,
      partySize: 4,
      brandId: 1,
    };

    it('should return available result when a vehicle is available', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      const result = await service.checkBookingAvailability(defaultParams);

      expect(result.available).toBe(true);
      expect(result.vehicleId).toBe(1);
      expect(result.vehicleName).toBe('Mercedes Sprinter');
      expect(result.conflicts).toEqual([]);
      expect(result.availableSlots).toEqual([]);
    });

    it('should call vehicleAvailabilityService.checkAvailability with correct params', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 2,
        vehicle_name: 'Sprinter 2',
        vehicle_capacity: 12,
        conflicts: [],
        available_vehicles: [{ id: 2, name: 'Sprinter 2', capacity: 12 }],
      });

      await service.checkBookingAvailability(defaultParams);

      expect(mockVehicleService.checkAvailability).toHaveBeenCalledWith(defaultParams);
    });

    it('should NOT fetch available slots when the slot IS available', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      await service.checkBookingAvailability(defaultParams);

      expect(mockVehicleService.getAvailableSlots).not.toHaveBeenCalled();
    });

    it('should fetch available slots when the slot is NOT available', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: ['All vehicles booked'],
        available_vehicles: [],
      });

      const mockSlots = [
        { start: '14:00', end: '20:00', available: true, vehicle_id: 1, vehicle_name: 'Sprinter 1' },
        { start: '15:00', end: '21:00', available: true, vehicle_id: 2, vehicle_name: 'Sprinter 2' },
      ];
      mockVehicleService.getAvailableSlots.mockResolvedValueOnce(mockSlots);

      const result = await service.checkBookingAvailability(defaultParams);

      expect(result.available).toBe(false);
      expect(result.availableSlots).toEqual(mockSlots);
      expect(mockVehicleService.getAvailableSlots).toHaveBeenCalledWith({
        date: defaultParams.date,
        durationHours: defaultParams.durationHours,
        partySize: defaultParams.partySize,
        brandId: defaultParams.brandId,
      });
    });

    it('should return conflicts from the availability check', async () => {
      const conflicts = ['All suitable vehicles are booked for this time slot'];
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts,
        available_vehicles: [],
      });
      mockVehicleService.getAvailableSlots.mockResolvedValueOnce([]);

      const result = await service.checkBookingAvailability(defaultParams);

      expect(result.conflicts).toEqual(conflicts);
    });

    it('should handle availability check without brandId', async () => {
      const params = {
        date: '2026-06-15',
        startTime: '10:00',
        durationHours: 6,
        partySize: 4,
      };

      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 3,
        vehicle_name: 'Sprinter 3',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 3, name: 'Sprinter 3', capacity: 14 }],
      });

      const result = await service.checkBookingAvailability(params);

      expect(result.available).toBe(true);
      expect(result.vehicleId).toBe(3);
    });

    it('should return empty availableSlots when available', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Sprinter 1',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Sprinter 1', capacity: 14 }],
      });

      const result = await service.checkBookingAvailability(defaultParams);

      expect(result.availableSlots).toHaveLength(0);
    });

    it('should return null vehicleId and vehicleName when not available', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: ['No vehicles available'],
        available_vehicles: [],
      });
      mockVehicleService.getAvailableSlots.mockResolvedValueOnce([]);

      const result = await service.checkBookingAvailability(defaultParams);

      expect(result.vehicleId).toBeNull();
      expect(result.vehicleName).toBeNull();
    });
  });

  // ============================================================================
  // createBookingWithAvailability
  // ============================================================================

  describe('createBookingWithAvailability', () => {
    const validBookingData = {
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      customerPhone: '+1-509-555-9876',
      partySize: 6,
      tourDate: '2026-07-20',
      startTime: '10:00',
      durationHours: 6,
      totalPrice: 850,
      depositPaid: 425,
      brandId: 1,
    };

    const mockBooking = {
      id: 42,
      booking_number: 'WWT-2026-00001',
      customer_id: 10,
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      customer_phone: '+1-509-555-9876',
      party_size: 6,
      tour_date: '2026-07-20',
      start_time: '10:00',
      end_time: '16:00',
      duration_hours: 6,
      total_price: 850,
      base_price: 850,
      gratuity: 0,
      taxes: 0,
      deposit_amount: 425,
      deposit_paid: true,
      final_payment_amount: 425,
      final_payment_paid: false,
      status: 'pending' as const,
      pickup_location: '',
      dropoff_location: '',
      brand_id: 1,
      vehicle_id: 1,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    function setupSuccessfulBookingMocks() {
      // 1. checkAvailability returns available
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      // 2. createHoldBlock succeeds
      mockVehicleService.createHoldBlock.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 1,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '16:00',
        block_type: 'hold' as const,
        booking_id: null,
        brand_id: 1,
        created_by: null,
        notes: 'Temporary hold',
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });

      // 3. calculateEndTime
      mockCoreService.calculateEndTime.mockReturnValueOnce('16:00');

      // 4. getOrCreateCustomer
      mockCoreService.getOrCreateCustomer.mockResolvedValueOnce(10);

      // 5. generateBookingNumber
      mockCoreService.generateBookingNumber.mockResolvedValueOnce('WWT-2026-00001');

      // 6. Mock the insert inside the transaction (via db.query)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));

      // 7. withTransaction should invoke the callback and pass through
      mockWithTransaction.mockImplementationOnce(async (callback: () => unknown) => {
        return callback();
      });

      // 8. convertHoldToBooking succeeds
      mockVehicleService.convertHoldToBooking.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 1,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '16:00',
        block_type: 'booking' as const,
        booking_id: 42,
        brand_id: 1,
        created_by: null,
        notes: null,
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });
    }

    it('should create a booking successfully when availability is confirmed', async () => {
      setupSuccessfulBookingMocks();

      const result = await service.createBookingWithAvailability(validBookingData);

      expect(result).toBeDefined();
      expect(result.id).toBe(42);
      expect(result.vehicle_id).toBe(1);
      expect(result.booking_number).toBe('WWT-2026-00001');
    });

    it('should call checkAvailability with correct parameters', async () => {
      setupSuccessfulBookingMocks();

      await service.createBookingWithAvailability(validBookingData);

      expect(mockVehicleService.checkAvailability).toHaveBeenCalledWith({
        date: validBookingData.tourDate,
        startTime: validBookingData.startTime,
        durationHours: validBookingData.durationHours,
        partySize: validBookingData.partySize,
        brandId: validBookingData.brandId,
      });
    });

    it('should throw ConflictError when no vehicles are available', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: ['All suitable vehicles are booked for this time slot'],
        available_vehicles: [],
      });

      await expect(
        service.createBookingWithAvailability(validBookingData)
      ).rejects.toThrow(ConflictError);
    });

    it('should include conflict messages in ConflictError', async () => {
      const conflictMessage = 'All suitable vehicles are booked for this time slot';
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: [conflictMessage],
        available_vehicles: [],
      });

      await expect(
        service.createBookingWithAvailability(validBookingData)
      ).rejects.toThrow(conflictMessage);
    });

    it('should throw a default message when no vehicles and no conflict messages', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: [],
        available_vehicles: [],
      });

      await expect(
        service.createBookingWithAvailability(validBookingData)
      ).rejects.toThrow('No vehicles available for this time slot');
    });

    it('should create a hold block after successful availability check', async () => {
      setupSuccessfulBookingMocks();

      await service.createBookingWithAvailability(validBookingData);

      expect(mockVehicleService.createHoldBlock).toHaveBeenCalledWith({
        vehicleId: 1,
        date: validBookingData.tourDate,
        startTime: validBookingData.startTime,
        endTime: '16:00',
        brandId: validBookingData.brandId,
      });
    });

    it('should use provided vehicleId when specified', async () => {
      const dataWithVehicle = { ...validBookingData, vehicleId: 3 };

      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      mockCoreService.calculateEndTime.mockReturnValueOnce('16:00');

      mockVehicleService.createHoldBlock.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 3,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '16:00',
        block_type: 'hold' as const,
        booking_id: null,
        brand_id: 1,
        created_by: null,
        notes: 'Temporary hold',
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });

      mockCoreService.getOrCreateCustomer.mockResolvedValueOnce(10);
      mockCoreService.generateBookingNumber.mockResolvedValueOnce('WWT-2026-00002');
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([{ ...mockBooking, vehicle_id: 3 }])
      );
      mockWithTransaction.mockImplementationOnce(async (callback: () => unknown) => callback());
      mockVehicleService.convertHoldToBooking.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 3,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '16:00',
        block_type: 'booking' as const,
        booking_id: 42,
        brand_id: 1,
        created_by: null,
        notes: null,
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });

      const result = await service.createBookingWithAvailability(dataWithVehicle);

      expect(result.vehicle_id).toBe(3);
    });

    it('should use provided endTime when specified', async () => {
      const dataWithEndTime = { ...validBookingData, endTime: '17:30' };

      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      mockVehicleService.createHoldBlock.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 1,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '17:30',
        block_type: 'hold' as const,
        booking_id: null,
        brand_id: 1,
        created_by: null,
        notes: 'Temporary hold',
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });

      mockCoreService.getOrCreateCustomer.mockResolvedValueOnce(10);
      mockCoreService.generateBookingNumber.mockResolvedValueOnce('WWT-2026-00003');
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockBooking]));
      mockWithTransaction.mockImplementationOnce(async (callback: () => unknown) => callback());
      mockVehicleService.convertHoldToBooking.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 1,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '17:30',
        block_type: 'booking' as const,
        booking_id: 42,
        brand_id: 1,
        created_by: null,
        notes: null,
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });

      await service.createBookingWithAvailability(dataWithEndTime);

      // Should NOT call calculateEndTime since endTime was explicitly provided
      expect(mockCoreService.calculateEndTime).not.toHaveBeenCalled();

      // Should pass the provided endTime to createHoldBlock
      expect(mockVehicleService.createHoldBlock).toHaveBeenCalledWith(
        expect.objectContaining({ endTime: '17:30' })
      );
    });

    it('should calculate endTime when not provided', async () => {
      setupSuccessfulBookingMocks();

      await service.createBookingWithAvailability(validBookingData);

      expect(mockCoreService.calculateEndTime).toHaveBeenCalledWith('10:00', 6);
    });

    it('should convert hold to booking after successful creation', async () => {
      setupSuccessfulBookingMocks();

      await service.createBookingWithAvailability(validBookingData);

      expect(mockVehicleService.convertHoldToBooking).toHaveBeenCalledWith(99, 42);
    });

    it('should rethrow ConflictError from createHoldBlock', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      mockCoreService.calculateEndTime.mockReturnValueOnce('16:00');

      mockVehicleService.createHoldBlock.mockRejectedValueOnce(
        new ConflictError('Time slot is no longer available')
      );

      await expect(
        service.createBookingWithAvailability(validBookingData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw generic error when createHoldBlock fails with non-conflict error', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      mockCoreService.calculateEndTime.mockReturnValueOnce('16:00');

      mockVehicleService.createHoldBlock.mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      await expect(
        service.createBookingWithAvailability(validBookingData)
      ).rejects.toThrow('Failed to reserve time slot');
    });

    it('should release hold block when booking creation fails', async () => {
      mockVehicleService.checkAvailability.mockResolvedValueOnce({
        available: true,
        vehicle_id: 1,
        vehicle_name: 'Mercedes Sprinter',
        vehicle_capacity: 14,
        conflicts: [],
        available_vehicles: [{ id: 1, name: 'Mercedes Sprinter', capacity: 14 }],
      });

      mockCoreService.calculateEndTime.mockReturnValueOnce('16:00');

      mockVehicleService.createHoldBlock.mockResolvedValueOnce({
        id: 99,
        vehicle_id: 1,
        block_date: '2026-07-20',
        start_time: '10:00',
        end_time: '16:00',
        block_type: 'hold' as const,
        booking_id: null,
        brand_id: 1,
        created_by: null,
        notes: 'Temporary hold',
        created_at: '2026-07-01T00:00:00Z',
        allow_overlap: false,
      });

      // Transaction fails
      mockWithTransaction.mockRejectedValueOnce(
        new Error('Transaction failed')
      );

      await expect(
        service.createBookingWithAvailability(validBookingData)
      ).rejects.toThrow('Transaction failed');

      expect(mockVehicleService.releaseHoldBlock).toHaveBeenCalledWith(99);
    });

    it('should throw validation error for invalid booking data', async () => {
      const invalidData = {
        customerName: '',
        customerEmail: 'not-an-email',
        customerPhone: '123',
        partySize: 0,
        tourDate: 'bad-date',
        startTime: 'bad-time',
        durationHours: 1, // Below minimum of 4
        totalPrice: -100,
        depositPaid: -50,
      };

      await expect(
        service.createBookingWithAvailability(invalidData)
      ).rejects.toThrow();
    });

    it('should throw validation error for partySize exceeding max', async () => {
      const invalidData = {
        ...validBookingData,
        partySize: 100,
      };

      await expect(
        service.createBookingWithAvailability(invalidData)
      ).rejects.toThrow();
    });

    it('should throw validation error for invalid tour date format', async () => {
      const invalidData = {
        ...validBookingData,
        tourDate: '07/20/2026',
      };

      await expect(
        service.createBookingWithAvailability(invalidData)
      ).rejects.toThrow();
    });

    it('should throw validation error for invalid start time format', async () => {
      const invalidData = {
        ...validBookingData,
        startTime: '10:00 AM',
      };

      await expect(
        service.createBookingWithAvailability(invalidData)
      ).rejects.toThrow();
    });

    it('should throw validation error for duration below minimum', async () => {
      const invalidData = {
        ...validBookingData,
        durationHours: 2,
      };

      await expect(
        service.createBookingWithAvailability(invalidData)
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // cancelWithVehicleRelease
  // ============================================================================

  describe('cancelWithVehicleRelease', () => {
    const mockCancelledBooking = {
      id: 42,
      booking_number: 'WWT-2026-00001',
      customer_id: 10,
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      customer_phone: '+1-509-555-9876',
      party_size: 6,
      tour_date: '2026-07-20',
      start_time: '10:00',
      end_time: '16:00',
      duration_hours: 6,
      total_price: 850,
      base_price: 850,
      gratuity: 0,
      taxes: 0,
      deposit_amount: 425,
      deposit_paid: true,
      final_payment_amount: 425,
      final_payment_paid: false,
      status: 'cancelled' as const,
      pickup_location: '',
      dropoff_location: '',
      brand_id: 1,
      vehicle_id: 1,
      cancellation_reason: 'Customer requested',
      cancelled_at: '2026-07-05T00:00:00Z',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-05T00:00:00Z',
    };

    it('should cancel booking and release vehicle availability blocks', async () => {
      mockCoreService.cancelBooking.mockResolvedValueOnce(mockCancelledBooking);
      mockVehicleService.deleteBookingBlocks.mockResolvedValueOnce(undefined);

      const result = await service.cancelWithVehicleRelease(42, 'Customer requested');

      expect(result).toBeDefined();
      expect(result.id).toBe(42);
      expect(result.status).toBe('cancelled');
    });

    it('should call bookingCoreService.cancelBooking with correct arguments', async () => {
      mockCoreService.cancelBooking.mockResolvedValueOnce(mockCancelledBooking);
      mockVehicleService.deleteBookingBlocks.mockResolvedValueOnce(undefined);

      await service.cancelWithVehicleRelease(42, 'Weather issues');

      expect(mockCoreService.cancelBooking).toHaveBeenCalledWith(42, 'Weather issues');
    });

    it('should call deleteBookingBlocks with the booking ID', async () => {
      mockCoreService.cancelBooking.mockResolvedValueOnce(mockCancelledBooking);
      mockVehicleService.deleteBookingBlocks.mockResolvedValueOnce(undefined);

      await service.cancelWithVehicleRelease(42, 'Customer requested');

      expect(mockVehicleService.deleteBookingBlocks).toHaveBeenCalledWith(42);
    });

    it('should cancel without a reason', async () => {
      mockCoreService.cancelBooking.mockResolvedValueOnce({
        ...mockCancelledBooking,
        cancellation_reason: undefined,
      });
      mockVehicleService.deleteBookingBlocks.mockResolvedValueOnce(undefined);

      const result = await service.cancelWithVehicleRelease(42);

      expect(result).toBeDefined();
      expect(mockCoreService.cancelBooking).toHaveBeenCalledWith(42, undefined);
    });

    it('should propagate errors from cancelBooking', async () => {
      mockCoreService.cancelBooking.mockRejectedValueOnce(
        new Error('Booking not found')
      );

      await expect(service.cancelWithVehicleRelease(999)).rejects.toThrow(
        'Booking not found'
      );
    });

    it('should propagate ConflictError from cancelBooking (e.g., already cancelled)', async () => {
      mockCoreService.cancelBooking.mockRejectedValueOnce(
        new ConflictError('Booking is already cancelled')
      );

      await expect(service.cancelWithVehicleRelease(42)).rejects.toThrow(
        ConflictError
      );
    });

    it('should propagate errors from deleteBookingBlocks', async () => {
      mockCoreService.cancelBooking.mockResolvedValueOnce(mockCancelledBooking);
      mockVehicleService.deleteBookingBlocks.mockRejectedValueOnce(
        new Error('Database error during block deletion')
      );

      await expect(
        service.cancelWithVehicleRelease(42, 'Customer requested')
      ).rejects.toThrow('Database error during block deletion');
    });

    it('should return the cancelled booking from the core service', async () => {
      mockCoreService.cancelBooking.mockResolvedValueOnce(mockCancelledBooking);
      mockVehicleService.deleteBookingBlocks.mockResolvedValueOnce(undefined);

      const result = await service.cancelWithVehicleRelease(42, 'Plans changed');

      expect(result).toEqual(mockCancelledBooking);
    });
  });

  // ============================================================================
  // serviceName
  // ============================================================================

  describe('serviceName', () => {
    it('should have the correct service name', () => {
      // Access via casting to any since serviceName is protected
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).serviceName).toBe('BookingAvailabilityService');
    });
  });
});
