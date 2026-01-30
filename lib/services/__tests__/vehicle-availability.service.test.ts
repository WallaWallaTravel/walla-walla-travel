/**
 * VehicleAvailabilityService Tests
 *
 * CRITICAL: Tests for double-booking prevention - this is a core business constraint
 * Coverage target: 75%+
 *
 * Key features tested:
 * - Conflict detection
 * - Hold block lifecycle (create → convert/release)
 * - Operating hours enforcement (08:00-22:00)
 * - Buffer time management
 * - Blackout date handling
 */

import { VehicleAvailabilityService } from '../vehicle-availability.service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockVehicle, createMockAvailabilityBlock } from '../../__tests__/factories';

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
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('VehicleAvailabilityService', () => {
  let service: VehicleAvailabilityService;

  beforeEach(() => {
    // Use mockReset to clear both call history AND queued return values
    // This prevents mock leakage between tests, especially with fire-and-forget async calls
    mockQuery.mockReset();
    service = new VehicleAvailabilityService();
  });

  // ============================================================================
  // checkVehicleAvailability Tests
  // ============================================================================

  describe('checkVehicleAvailability', () => {
    const testDate = '2025-01-15';
    const testVehicleId = 1;

    it('should return available=true when no conflicts exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '10:00',
        '16:00'
      );

      expect(result.available).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return available=false when conflicts exist', async () => {
      const conflictBlock = createMockAvailabilityBlock({
        vehicle_id: testVehicleId,
        block_date: testDate,
        start_time: '12:00',
        end_time: '18:00',
        block_type: 'booking',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([conflictBlock]));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '10:00',
        '16:00'
      );

      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });

    it('should detect overlapping blocks at start of requested time', async () => {
      // Existing block: 08:00-12:00, Requested: 10:00-14:00
      const conflictBlock = createMockAvailabilityBlock({
        start_time: '08:00',
        end_time: '12:00',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([conflictBlock]));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '10:00',
        '14:00'
      );

      expect(result.available).toBe(false);
    });

    it('should detect overlapping blocks at end of requested time', async () => {
      // Existing block: 14:00-18:00, Requested: 10:00-16:00
      const conflictBlock = createMockAvailabilityBlock({
        start_time: '14:00',
        end_time: '18:00',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([conflictBlock]));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '10:00',
        '16:00'
      );

      expect(result.available).toBe(false);
    });

    it('should detect when requested time is fully contained in existing block', async () => {
      // Existing block: 08:00-18:00, Requested: 10:00-14:00
      const conflictBlock = createMockAvailabilityBlock({
        start_time: '08:00',
        end_time: '18:00',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([conflictBlock]));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '10:00',
        '14:00'
      );

      expect(result.available).toBe(false);
    });

    it('should detect when existing block is fully contained in requested time', async () => {
      // Existing block: 12:00-14:00, Requested: 10:00-18:00
      const conflictBlock = createMockAvailabilityBlock({
        start_time: '12:00',
        end_time: '14:00',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([conflictBlock]));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '10:00',
        '18:00'
      );

      expect(result.available).toBe(false);
    });

    it('should return multiple conflicts when they exist', async () => {
      const conflicts = [
        createMockAvailabilityBlock({ start_time: '10:00', end_time: '12:00' }),
        createMockAvailabilityBlock({ start_time: '14:00', end_time: '16:00' }),
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(conflicts));

      const result = await service.checkVehicleAvailability(
        testVehicleId,
        testDate,
        '09:00',
        '17:00'
      );

      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(2);
    });

    it('should pass correct parameters to query', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.checkVehicleAvailability(testVehicleId, testDate, '10:00', '16:00');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('vehicle_id = $1'),
        [testVehicleId, testDate, '10:00', '16:00']
      );
    });
  });

  // ============================================================================
  // checkAvailability Tests (High-level availability check)
  // ============================================================================

  describe('checkAvailability', () => {
    const testDate = '2025-01-15';

    beforeEach(() => {
      // Reset date to test date to avoid past-date issues
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reject times outside operating hours (before 08:00)', async () => {
      const result = await service.checkAvailability({
        date: testDate,
        startTime: '06:00',
        durationHours: 4,
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('Tours must be between 08:00 and 22:00');
    });

    it('should reject times outside operating hours (after 22:00)', async () => {
      const result = await service.checkAvailability({
        date: testDate,
        startTime: '20:00',
        durationHours: 4, // Would end at 24:00
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('Tours must be between 08:00 and 22:00');
    });

    it('should accept times within operating hours', async () => {
      // Mock cleanup, blackout check, and vehicle query
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ id: 1, capacity: 14 })
        ])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([])); // conflicts

      const result = await service.checkAvailability({
        date: testDate,
        startTime: '10:00',
        durationHours: 6, // Would end at 16:00
        partySize: 6,
      });

      expect(result.available).toBe(true);
    });

    it('should reject bookings in the past', async () => {
      const result = await service.checkAvailability({
        date: '2025-01-05', // Before our mocked date of 2025-01-10
        startTime: '10:00',
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('Cannot book tours in the past');
    });

    it('should reject blackout dates', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([
          { reason: 'Holiday closure' }
        ])); // blackouts

      const result = await service.checkAvailability({
        date: testDate,
        startTime: '10:00',
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('Holiday closure');
    });

    it('should return smallest suitable vehicle when available', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ id: 1, make: 'Mercedes', model: 'S-Class', capacity: 4 }),
          createMockVehicle({ id: 2, make: 'Mercedes', model: 'Sprinter', capacity: 14 }),
        ])) // vehicles (ordered by capacity)
        .mockResolvedValueOnce(createMockQueryResult([])) // conflicts for vehicle 1
        .mockResolvedValueOnce(createMockQueryResult([])); // conflicts for vehicle 2

      const result = await service.checkAvailability({
        date: testDate,
        startTime: '10:00',
        durationHours: 6,
        partySize: 3,
      });

      expect(result.available).toBe(true);
      expect(result.vehicle_id).toBe(1);
      expect(result.vehicle_name).toBe('Mercedes S-Class');
    });

    it('should report no vehicles available when capacity insufficient', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([])) // no vehicles with capacity
        .mockResolvedValueOnce(createMockQueryResult([])); // all conflicts query

      const result = await service.checkAvailability({
        date: testDate,
        startTime: '10:00',
        durationHours: 6,
        partySize: 20, // Too large for any vehicle
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('No vehicles available with capacity for 20 guests');
    });

    it('should report all vehicles booked when conflicts exist', async () => {
      // Query flow: cleanup (async) → blackouts → vehicles → batch conflicts → all conflicts
      // Note: cleanup is fire-and-forget but still consumes a mock
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([], 0)) // cleanup (DELETE returns rowCount)
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ id: 1, capacity: 14 })
        ])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([
          // Batch conflicts query - must include vehicle_id to match the vehicle
          createMockAvailabilityBlock({ vehicle_id: 1, block_type: 'booking' })
        ])) // conflicts for vehicle 1 (via batch query)
        .mockResolvedValueOnce(createMockQueryResult([
          { vehicle_name: 'Mercedes Sprinter', block_type: 'booking' }
        ])); // all conflicts query (for error message)

      const result = await service.checkAvailability({
        date: testDate,
        startTime: '10:00',
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('All suitable vehicles are booked for this time slot');
    });
  });

  // ============================================================================
  // Hold Block Lifecycle Tests
  // ============================================================================

  describe('createHoldBlock', () => {
    it('should create a hold block successfully', async () => {
      const holdBlock = createMockAvailabilityBlock({
        id: 1,
        block_type: 'hold',
        booking_id: null,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([holdBlock]));

      const result = await service.createHoldBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
      });

      expect(result.block_type).toBe('hold');
      expect(result.booking_id).toBeNull();
    });

    it('should throw ConflictError when slot is taken', async () => {
      // Simulate PostgreSQL exclusion constraint violation
      const pgError = new Error('exclusion constraint violation') as Error & { code: string };
      pgError.code = '23P01';
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(service.createHoldBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
      })).rejects.toThrow('Time slot is no longer available');
    });

    it('should include optional brand_id when provided', async () => {
      const holdBlock = createMockAvailabilityBlock({
        brand_id: 1,
        block_type: 'hold',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([holdBlock]));

      const result = await service.createHoldBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
        brandId: 1,
      });

      expect(result.brand_id).toBe(1);
    });
  });

  describe('convertHoldToBooking', () => {
    it('should convert hold block to booking block', async () => {
      const bookingBlock = createMockAvailabilityBlock({
        id: 1,
        block_type: 'booking',
        booking_id: 123,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([bookingBlock]));

      const result = await service.convertHoldToBooking(1, 123);

      expect(result.block_type).toBe('booking');
      expect(result.booking_id).toBe(123);
    });

    it('should throw NotFoundError when block not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.convertHoldToBooking(999, 123)).rejects.toThrow();
    });
  });

  describe('releaseHoldBlock', () => {
    it('should delete the hold block', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.releaseHoldBlock(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // Maintenance Block Tests
  // ============================================================================

  describe('createMaintenanceBlock', () => {
    it('should create a maintenance block', async () => {
      const maintenanceBlock = createMockAvailabilityBlock({
        block_type: 'maintenance',
        notes: 'Oil change',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([maintenanceBlock]));

      const result = await service.createMaintenanceBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '08:00',
        endTime: '12:00',
        reason: 'Oil change',
      });

      expect(result.block_type).toBe('maintenance');
      expect(result.notes).toBe('Oil change');
    });

    it('should throw ConflictError when maintenance conflicts with booking', async () => {
      const pgError = new Error('exclusion constraint violation') as Error & { code: string };
      pgError.code = '23P01';
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(service.createMaintenanceBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
        reason: 'Maintenance',
      })).rejects.toThrow('Cannot create maintenance block');
    });
  });

  // ============================================================================
  // Query Operations Tests
  // ============================================================================

  describe('getVehicleBlocks', () => {
    it('should return all blocks for a vehicle on a date', async () => {
      const blocks = [
        createMockAvailabilityBlock({ start_time: '10:00', end_time: '12:00' }),
        createMockAvailabilityBlock({ start_time: '14:00', end_time: '18:00' }),
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(blocks));

      const result = await service.getVehicleBlocks(1, '2025-01-15');

      expect(result).toHaveLength(2);
    });
  });

  describe('getDayBlocks', () => {
    it('should return all blocks for a day across all vehicles', async () => {
      const blocks = [
        { ...createMockAvailabilityBlock(), vehicle_name: 'Mercedes Sprinter' },
        { ...createMockAvailabilityBlock(), vehicle_name: 'Cadillac Escalade' },
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(blocks));

      const result = await service.getDayBlocks('2025-01-15');

      expect(result).toHaveLength(2);
      expect(result[0].vehicle_name).toBeDefined();
    });
  });

  describe('getBlocksInRange', () => {
    it('should return blocks within date range', async () => {
      const blocks = [
        { ...createMockAvailabilityBlock({ block_date: '2025-01-15' }), vehicle_name: 'Sprinter' },
        { ...createMockAvailabilityBlock({ block_date: '2025-01-16' }), vehicle_name: 'Sprinter' },
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(blocks));

      const result = await service.getBlocksInRange('2025-01-15', '2025-01-17');

      expect(result).toHaveLength(2);
    });

    it('should filter by vehicle when provided', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getBlocksInRange('2025-01-15', '2025-01-17', 1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('vehicle_id = $3'),
        expect.arrayContaining([1])
      );
    });
  });

  // ============================================================================
  // Delete Operations Tests
  // ============================================================================

  describe('deleteBlock', () => {
    it('should delete a non-booking block', async () => {
      const holdBlock = createMockAvailabilityBlock({
        block_type: 'hold',
        booking_id: null,
      });
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([holdBlock])) // SELECT
        .mockResolvedValueOnce(createMockQueryResult([])); // DELETE

      await service.deleteBlock(1);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundError when block not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.deleteBlock(999)).rejects.toThrow();
    });

    it('should throw ValidationError when trying to delete a booking block', async () => {
      const bookingBlock = createMockAvailabilityBlock({
        block_type: 'booking',
        booking_id: 123,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([bookingBlock]));

      await expect(service.deleteBlock(1)).rejects.toThrow('Cannot delete booking blocks');
    });
  });

  describe('deleteBookingBlocks', () => {
    it('should delete all blocks for a booking', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.deleteBookingBlocks(123);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        [123]
      );
    });
  });

  // ============================================================================
  // Cleanup Operations Tests
  // ============================================================================

  describe('cleanupExpiredHolds', () => {
    it('should delete expired holds and return count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2,
      });

      const result = await service.cleanupExpiredHolds();

      expect(result).toBe(2);
    });

    it('should return 0 when no expired holds exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await service.cleanupExpiredHolds();

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle exactly 08:00 start time (boundary)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ capacity: 14 })
        ])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([])); // conflicts

      const result = await service.checkAvailability({
        date: '2025-01-15',
        startTime: '08:00',
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(true);

      jest.useRealTimers();
    });

    it('should handle exactly 22:00 end time (boundary)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ capacity: 14 })
        ])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([])); // conflicts

      const result = await service.checkAvailability({
        date: '2025-01-15',
        startTime: '16:00', // + 6 hours = 22:00
        durationHours: 6,
        partySize: 6,
      });

      expect(result.available).toBe(true);

      jest.useRealTimers();
    });

    it('should handle minimum party size of 1', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ capacity: 4 })
        ])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([])); // conflicts

      const result = await service.checkAvailability({
        date: '2025-01-15',
        startTime: '10:00',
        durationHours: 4,
        partySize: 1,
      });

      expect(result.available).toBe(true);

      jest.useRealTimers();
    });

    it('should handle minimum duration of 4 hours', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([])) // cleanup
        .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
        .mockResolvedValueOnce(createMockQueryResult([
          createMockVehicle({ capacity: 14 })
        ])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([])); // conflicts

      const result = await service.checkAvailability({
        date: '2025-01-15',
        startTime: '10:00',
        durationHours: 4, // Minimum duration
        partySize: 6,
      });

      expect(result.available).toBe(true);

      jest.useRealTimers();
    });
  });

  // ============================================================================
  // Time Helper Methods Tests (via public interface)
  // ============================================================================

  describe('time calculations (integration)', () => {
    it('should correctly calculate end time from start and duration', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));

      // We can verify time calculation by checking operating hours rejection
      // 20:00 + 4 hours = 24:00, which is outside 22:00 limit
      const result = await service.checkAvailability({
        date: '2025-01-15',
        startTime: '20:00',
        durationHours: 4,
        partySize: 6,
      });

      expect(result.available).toBe(false);
      expect(result.conflicts).toContain('Tours must be between 08:00 and 22:00');

      jest.useRealTimers();
    });
  });

  // ============================================================================
  // Buffer Block Tests
  // ============================================================================

  describe('createBufferBlocks', () => {
    it('should create pre-booking buffer block', async () => {
      // Two insert calls for pre and post buffers
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock({ block_type: 'buffer' })])) // pre-buffer
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock({ block_type: 'buffer' })])); // post-buffer

      await service.createBufferBlocks({
        vehicleId: 1,
        date: '2025-01-15',
        bookingStartTime: '10:00',
        bookingEndTime: '16:00',
        bookingId: 123,
      });

      // Verify pre-buffer insert was called
      const preBufferCall = mockQuery.mock.calls[0];
      expect(preBufferCall[0]).toContain('INSERT INTO vehicle_availability_blocks');
    });

    it('should create post-booking buffer block', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()])) // pre
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()])); // post

      await service.createBufferBlocks({
        vehicleId: 1,
        date: '2025-01-15',
        bookingStartTime: '10:00',
        bookingEndTime: '16:00',
        bookingId: 123,
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should use custom buffer minutes when provided', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()]))
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()]));

      await service.createBufferBlocks({
        vehicleId: 1,
        date: '2025-01-15',
        bookingStartTime: '10:00',
        bookingEndTime: '14:00',
        bookingId: 123,
        bufferMinutes: 30,
      });

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should not create pre-buffer if it would start before operating hours', async () => {
      // Booking starts at 08:00, so 60 min buffer would be 07:00 (before operating hours)
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()])); // only post-buffer

      await service.createBufferBlocks({
        vehicleId: 1,
        date: '2025-01-15',
        bookingStartTime: '08:00', // buffer would be 07:00
        bookingEndTime: '14:00',
        bookingId: 123,
      });

      // Should only have one call (post-buffer)
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should not create post-buffer if it would end after operating hours', async () => {
      // Booking ends at 22:00, so 60 min buffer would be 23:00 (after operating hours)
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()])); // only pre-buffer

      await service.createBufferBlocks({
        vehicleId: 1,
        date: '2025-01-15',
        bookingStartTime: '16:00',
        bookingEndTime: '22:00', // buffer would be 23:00
        bookingId: 123,
      });

      // Should only have one call (pre-buffer)
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should silently ignore buffer creation conflicts', async () => {
      // First buffer succeeds, second fails with conflict
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([createMockAvailabilityBlock()]))
        .mockRejectedValueOnce(new Error('conflict'));

      // Should not throw
      await expect(service.createBufferBlocks({
        vehicleId: 1,
        date: '2025-01-15',
        bookingStartTime: '10:00',
        bookingEndTime: '16:00',
        bookingId: 123,
      })).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // Available Slots Tests
  // ============================================================================

  describe('getAvailableSlots', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return hourly slots for a 4-hour tour', async () => {
      // For 4-hour tours, last start time is 18:00 (ends at 22:00)
      // So slots: 08:00, 09:00, 10:00, ..., 18:00 = 11 slots

      // Each checkAvailability call needs mocks for cleanup, blackouts, vehicles, conflicts
      const setupMocks = () => {
        mockQuery
          .mockResolvedValueOnce(createMockQueryResult([])) // cleanup (doesn't wait)
          .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
          .mockResolvedValueOnce(createMockQueryResult([createMockVehicle({ capacity: 6 })])) // vehicles
          .mockResolvedValueOnce(createMockQueryResult([])); // conflicts
      };

      // Setup mocks for multiple checkAvailability calls (11 slots)
      for (let i = 0; i < 11; i++) {
        setupMocks();
      }

      const result = await service.getAvailableSlots({
        date: '2025-01-15',
        durationHours: 4,
        partySize: 6,
      });

      expect(result.length).toBe(11);
      expect(result[0].start).toBe('08:00');
      expect(result[0].end).toBe('12:00');
      expect(result[10].start).toBe('18:00');
      expect(result[10].end).toBe('22:00');
    });

    it('should mark slots as available or unavailable', async () => {
      // With 6-hour duration, slots are 08:00-14:00, 09:00-15:00, ..., 16:00-22:00 = 9 slots
      // checkAvailability calls: cleanupExpiredHolds (async), blackouts, findAvailableVehicles
      // findAvailableVehicles calls: vehicles query, then conflicts for each vehicle

      // Use mockImplementation to return appropriate results based on call pattern
      let callCount = 0;
      const vehicle = createMockVehicle({ id: 1, capacity: 6 });

      mockQuery.mockImplementation(() => {
        callCount++;
        // Pattern per slot: cleanup, blackouts, vehicles, conflicts
        const modResult = callCount % 4;

        if (modResult === 1) {
          // cleanupExpiredHolds (async DELETE)
          return Promise.resolve(createMockQueryResult([], 0));
        } else if (modResult === 2) {
          // blackouts query
          return Promise.resolve(createMockQueryResult([]));
        } else if (modResult === 3) {
          // vehicles query
          return Promise.resolve(createMockQueryResult([vehicle]));
        } else {
          // conflicts query
          return Promise.resolve(createMockQueryResult([]));
        }
      });

      const result = await service.getAvailableSlots({
        date: '2025-01-15',
        durationHours: 6,
        partySize: 6,
      });

      // Should have 9 slots (08:00 through 16:00)
      expect(result.length).toBe(9);
      expect(result[0].start).toBe('08:00');
      expect(result[0].end).toBe('14:00');
      // All slots should be available since mock returns no conflicts
      expect(result[0].available).toBe(true);
    });

    it('should include vehicle info for available slots', async () => {
      const vehicle = createMockVehicle({ id: 1, make: 'Mercedes', model: 'Sprinter', capacity: 6 });

      // Use mockImplementation for consistent mock handling
      let callCount = 0;
      mockQuery.mockImplementation(() => {
        callCount++;
        const modResult = callCount % 4;

        if (modResult === 1) {
          // cleanupExpiredHolds
          return Promise.resolve(createMockQueryResult([], 0));
        } else if (modResult === 2) {
          // blackouts query
          return Promise.resolve(createMockQueryResult([]));
        } else if (modResult === 3) {
          // vehicles query
          return Promise.resolve(createMockQueryResult([vehicle]));
        } else {
          // conflicts query
          return Promise.resolve(createMockQueryResult([]));
        }
      });

      const result = await service.getAvailableSlots({
        date: '2025-01-15',
        durationHours: 4,
        partySize: 6,
      });

      expect(result[0].vehicle_id).toBe(1);
      expect(result[0].vehicle_name).toBe('Mercedes Sprinter');
    });

    it('should filter by brand when provided', async () => {
      const vehicle = createMockVehicle({ capacity: 6 });

      // Setup mocks for all slots
      for (let i = 0; i < 11; i++) {
        mockQuery
          .mockResolvedValueOnce(createMockQueryResult([])) // blackouts
          .mockResolvedValueOnce(createMockQueryResult([vehicle])) // vehicles
          .mockResolvedValueOnce(createMockQueryResult([])); // conflicts
      }

      await service.getAvailableSlots({
        date: '2025-01-15',
        durationHours: 4,
        partySize: 6,
        brandId: 1,
      });

      // Verify brandId was passed through
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should re-throw non-constraint errors in createHoldBlock', async () => {
      // Reset to ensure clean state
      mockQuery.mockReset();
      const genericError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(genericError);

      await expect(service.createHoldBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
      })).rejects.toThrow('Database connection failed');
    });

    it('should re-throw non-constraint errors in createMaintenanceBlock', async () => {
      // Reset to ensure clean state
      mockQuery.mockReset();
      const genericError = new Error('Network error');
      mockQuery.mockRejectedValue(genericError);

      await expect(service.createMaintenanceBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
        reason: 'Maintenance',
      })).rejects.toThrow('Network error');
    });

    it('should convert constraint violation to ConflictError in createHoldBlock', async () => {
      mockQuery.mockReset();
      const constraintError = new Error('exclusion constraint') as Error & { code: string };
      constraintError.code = '23P01';
      mockQuery.mockRejectedValue(constraintError);

      await expect(service.createHoldBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
      })).rejects.toThrow('Time slot is no longer available');
    });

    it('should convert constraint violation to ConflictError in createMaintenanceBlock', async () => {
      mockQuery.mockReset();
      const constraintError = new Error('exclusion constraint') as Error & { code: string };
      constraintError.code = '23P01';
      mockQuery.mockRejectedValue(constraintError);

      await expect(service.createMaintenanceBlock({
        vehicleId: 1,
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
        reason: 'Scheduled service',
      })).rejects.toThrow('Cannot create maintenance block');
    });
  });

  // ============================================================================
  // Brand Filtering Tests
  // ============================================================================

  describe('brand filtering in findAvailableVehicles', () => {
    it('should filter vehicles by brand when brandId provided', async () => {
      const vehicle = createMockVehicle({
        capacity: 6,
        brand_ids: [1, 2],
      });
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([vehicle])) // vehicles
        .mockResolvedValueOnce(createMockQueryResult([])); // no conflicts

      const result = await service.findAvailableVehicles({
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
        partySize: 6,
        brandId: 1,
      });

      expect(result).toHaveLength(1);
      // Verify the query included brand filtering
      const vehicleQuery = mockQuery.mock.calls[0][0];
      expect(vehicleQuery).toContain('available_to_all_brands');
    });

    it('should return vehicles available to all brands', async () => {
      const vehicle = createMockVehicle({
        capacity: 6,
        available_to_all_brands: true,
      });
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([vehicle]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.findAvailableVehicles({
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '16:00',
        partySize: 6,
        brandId: 999, // Even unknown brand should get vehicles available to all
      });

      expect(result).toHaveLength(1);
    });
  });
});
