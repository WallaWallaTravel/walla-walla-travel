/**
 * Vehicle Availability Service
 *
 * Manages vehicle availability blocks with PostgreSQL exclusion constraint
 * for bulletproof double-booking prevention across all brands.
 *
 * Key features:
 * - Transactional hold → booking flow
 * - Automatic conflict detection via database constraint
 * - Multi-brand support with shared vehicle pool
 * - Buffer time management
 */

import { BaseService } from './base.service';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type BlockType = 'booking' | 'maintenance' | 'hold' | 'buffer' | 'blackout';

export interface AvailabilityBlock {
  id: number;
  vehicle_id: number;
  block_date: string;
  start_time: string;
  end_time: string;
  block_type: BlockType;
  booking_id: number | null;
  brand_id: number | null;
  created_by: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateBlockInput {
  vehicle_id: number;
  block_date: string;
  start_time: string;
  end_time: string;
  block_type: BlockType;
  booking_id?: number;
  brand_id?: number;
  created_by?: number;
  notes?: string;
}

// Hold expiration time in minutes
const HOLD_EXPIRATION_MINUTES = 15;

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  vehicle_id?: number;
  vehicle_name?: string;
  block_type?: BlockType;
}

export interface VehicleWithAvailability {
  id: number;
  name: string;
  make: string;
  model: string;
  capacity: number;
  vehicle_type: string;
  license_plate: string;
  status: string;
  available_brands: number[];
  blocks: AvailabilityBlock[];
}

export interface AvailabilityCheckResult {
  available: boolean;
  vehicle_id: number | null;
  vehicle_name: string | null;
  vehicle_capacity: number | null;
  conflicts: string[];
  available_vehicles: Array<{
    id: number;
    name: string;
    capacity: number;
  }>;
}

// ============================================================================
// Vehicle Availability Service
// ============================================================================

export class VehicleAvailabilityService extends BaseService {
  protected get serviceName(): string {
    return 'VehicleAvailabilityService';
  }

  // Buffer time before and after each booking (minutes)
  private readonly BUFFER_MINUTES = 60;

  // Operating hours
  private readonly DAY_START = '08:00';
  private readonly DAY_END = '22:00';

  // ==========================================================================
  // Core Availability Operations
  // ==========================================================================

  /**
   * Check if a specific time slot is available for a vehicle
   * Uses the exclusion constraint implicitly via query
   * Ignores expired hold blocks (holds older than HOLD_EXPIRATION_MINUTES)
   */
  async checkVehicleAvailability(
    vehicleId: number,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ available: boolean; conflicts: AvailabilityBlock[] }> {
    this.log('Checking vehicle availability', { vehicleId, date, startTime, endTime });

    // Query for any overlapping blocks, excluding expired holds
    const conflicts = await this.queryMany<AvailabilityBlock>(`
      SELECT * FROM vehicle_availability_blocks
      WHERE vehicle_id = $1
      AND block_date = $2
      AND (start_time < $4 AND end_time > $3)
      AND NOT (
        block_type = 'hold'
        AND booking_id IS NULL
        AND created_at < NOW() - INTERVAL '${HOLD_EXPIRATION_MINUTES} minutes'
      )
      ORDER BY start_time
    `, [vehicleId, date, startTime, endTime]);

    return {
      available: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Clean up expired hold blocks
   * Should be called periodically (e.g., via cron job or on each availability check)
   */
  async cleanupExpiredHolds(): Promise<number> {
    this.log('Cleaning up expired holds');

    const result = await this.query(
      `DELETE FROM vehicle_availability_blocks
       WHERE block_type = 'hold'
       AND booking_id IS NULL
       AND created_at < NOW() - INTERVAL '${HOLD_EXPIRATION_MINUTES} minutes'
       RETURNING id`
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      this.log(`Cleaned up ${deletedCount} expired holds`);
    }

    return deletedCount;
  }

  /**
   * Find available vehicles for a given time slot and party size
   * Checks across all brands or specific brand
   */
  async findAvailableVehicles(params: {
    date: string;
    startTime: string;
    endTime: string;
    partySize: number;
    brandId?: number;
  }): Promise<VehicleWithAvailability[]> {
    const { date, startTime, endTime, partySize, brandId } = params;
    this.log('Finding available vehicles', params);

    // Get vehicles that can accommodate party size
    let vehicleQuery = `
      SELECT
        v.id, v.make, v.model, v.capacity, v.vehicle_type,
        v.license_plate, v.status
      FROM vehicles v
      WHERE v.capacity >= $1
      AND v.status = 'active'
    `;
    const vehicleParams: unknown[] = [partySize];

    // If brand specified, filter by brand association
    if (brandId) {
      vehicleQuery += ` AND (v.available_to_all_brands = true OR $${vehicleParams.length + 1} = ANY(v.brand_ids))`;
      vehicleParams.push(brandId);
    }

    vehicleQuery += ` ORDER BY v.capacity ASC`;

    interface VehicleRow {
      id: number;
      make: string;
      model: string;
      capacity: number;
      vehicle_type: string;
      license_plate: string;
      status: string;
      brand_ids?: number[];
    }
    const vehicles = await this.queryMany<VehicleRow>(vehicleQuery, vehicleParams);

    // Check availability for each vehicle
    const availableVehicles: VehicleWithAvailability[] = [];

    for (const vehicle of vehicles) {
      const { available, conflicts } = await this.checkVehicleAvailability(
        vehicle.id,
        date,
        startTime,
        endTime
      );

      if (available) {
        availableVehicles.push({
          ...vehicle,
          name: `${vehicle.make} ${vehicle.model}`,
          available_brands: vehicle.brand_ids || [],
          blocks: conflicts
        });
      }
    }

    return availableVehicles;
  }

  /**
   * Check if ANY vehicle is available for a time slot
   * Returns the best matching vehicle
   */
  async checkAvailability(params: {
    date: string;
    startTime: string;
    durationHours: number;
    partySize: number;
    brandId?: number;
  }): Promise<AvailabilityCheckResult> {
    const { date, startTime, durationHours, partySize, brandId } = params;
    this.log('Checking availability', params);

    // Opportunistically clean up expired holds (non-blocking, best effort)
    this.cleanupExpiredHolds().catch(() => {});

    // Calculate end time
    const endTime = this.addHours(startTime, durationHours);

    // Validate time is within operating hours
    if (!this.isWithinOperatingHours(startTime, endTime)) {
      return {
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: [`Tours must be between ${this.DAY_START} and ${this.DAY_END}`],
        available_vehicles: []
      };
    }

    // Validate date is not in the past
    const requestDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate < today) {
      return {
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: ['Cannot book tours in the past'],
        available_vehicles: []
      };
    }

    // Check for blackout dates
    const blackouts = await this.queryMany<{ reason: string }>(`
      SELECT reason FROM availability_rules
      WHERE rule_type = 'blackout_date'
      AND is_active = true
      AND blackout_date = $1
    `, [date]);

    if (blackouts.length > 0) {
      return {
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts: blackouts.map(b => b.reason || 'Date unavailable'),
        available_vehicles: []
      };
    }

    // Find available vehicles
    const availableVehicles = await this.findAvailableVehicles({
      date,
      startTime,
      endTime,
      partySize,
      brandId
    });

    if (availableVehicles.length === 0) {
      // Get more specific conflict info
      const allConflicts = await this.queryMany<{ vehicle_name: string; block_type: string }>(`
        SELECT
          CONCAT(v.make, ' ', v.model) as vehicle_name,
          vab.block_type
        FROM vehicle_availability_blocks vab
        JOIN vehicles v ON v.id = vab.vehicle_id
        WHERE vab.block_date = $1
        AND vab.start_time < $3
        AND vab.end_time > $2
        AND v.capacity >= $4
        AND v.status = 'active'
      `, [date, startTime, endTime, partySize]);

      const conflicts = allConflicts.length > 0
        ? ['All suitable vehicles are booked for this time slot']
        : [`No vehicles available with capacity for ${partySize} guests`];

      return {
        available: false,
        vehicle_id: null,
        vehicle_name: null,
        vehicle_capacity: null,
        conflicts,
        available_vehicles: []
      };
    }

    // Return first (smallest suitable) vehicle
    const bestVehicle = availableVehicles[0];

    return {
      available: true,
      vehicle_id: bestVehicle.id,
      vehicle_name: bestVehicle.name,
      vehicle_capacity: bestVehicle.capacity,
      conflicts: [],
      available_vehicles: availableVehicles.map(v => ({
        id: v.id,
        name: v.name,
        capacity: v.capacity
      }))
    };
  }

  // ==========================================================================
  // Block Management (Transactional Booking Flow)
  // ==========================================================================

  /**
   * Create a HOLD block for a booking in progress
   * This is the first step in the transactional booking flow
   * The exclusion constraint will throw if there's a conflict
   */
  async createHoldBlock(params: {
    vehicleId: number;
    date: string;
    startTime: string;
    endTime: string;
    brandId?: number;
    createdBy?: number;
    notes?: string;
  }): Promise<AvailabilityBlock> {
    this.log('Creating hold block', params);

    try {
      const block = await this.insert<AvailabilityBlock>('vehicle_availability_blocks', {
        vehicle_id: params.vehicleId,
        block_date: params.date,
        start_time: params.startTime,
        end_time: params.endTime,
        block_type: 'hold',
        brand_id: params.brandId || null,
        created_by: params.createdBy || null,
        notes: params.notes || 'Temporary hold for booking in progress',
        created_at: new Date()
      });

      this.log('Hold block created', { blockId: block.id });
      return block;
    } catch (error) {
      // Check if it's a conflict error from the exclusion constraint
      const pgError = error as { code?: string };
      if (pgError.code === '23P01') {
        throw new ConflictError('Time slot is no longer available. Another booking was just made for this time.');
      }
      throw error;
    }
  }

  /**
   * Convert a HOLD block to a BOOKING block
   * This is called after the booking is successfully created
   */
  async convertHoldToBooking(
    holdBlockId: number,
    bookingId: number
  ): Promise<AvailabilityBlock> {
    this.log('Converting hold to booking', { holdBlockId, bookingId });

    const updated = await this.update<AvailabilityBlock>(
      'vehicle_availability_blocks',
      holdBlockId,
      {
        block_type: 'booking',
        booking_id: bookingId,
        notes: null
      }
    );

    if (!updated) {
      throw new NotFoundError('Availability block', holdBlockId.toString());
    }

    return updated;
  }

  /**
   * Release a HOLD block (if booking fails)
   */
  async releaseHoldBlock(holdBlockId: number): Promise<void> {
    this.log('Releasing hold block', { holdBlockId });
    await this.delete('vehicle_availability_blocks', holdBlockId);
  }

  /**
   * Create a maintenance/blackout block
   */
  async createMaintenanceBlock(params: {
    vehicleId: number;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
    createdBy?: number;
  }): Promise<AvailabilityBlock> {
    this.log('Creating maintenance block', params);

    try {
      return await this.insert<AvailabilityBlock>('vehicle_availability_blocks', {
        vehicle_id: params.vehicleId,
        block_date: params.date,
        start_time: params.startTime,
        end_time: params.endTime,
        block_type: 'maintenance',
        created_by: params.createdBy || null,
        notes: params.reason,
        created_at: new Date()
      });
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === '23P01') {
        throw new ConflictError('Cannot create maintenance block - time slot has existing bookings');
      }
      throw error;
    }
  }

  /**
   * Create buffer blocks around a booking
   * Optional - can be used to ensure vehicles have prep time
   */
  async createBufferBlocks(params: {
    vehicleId: number;
    date: string;
    bookingStartTime: string;
    bookingEndTime: string;
    bufferMinutes?: number;
    bookingId: number;
  }): Promise<void> {
    const bufferMins = params.bufferMinutes || this.BUFFER_MINUTES;

    // Buffer before
    const beforeStart = this.subtractMinutes(params.bookingStartTime, bufferMins);
    if (beforeStart >= this.DAY_START) {
      try {
        await this.insert('vehicle_availability_blocks', {
          vehicle_id: params.vehicleId,
          block_date: params.date,
          start_time: beforeStart,
          end_time: params.bookingStartTime,
          block_type: 'buffer',
          booking_id: params.bookingId,
          notes: 'Pre-booking buffer',
          created_at: new Date()
        });
      } catch {
        // Ignore if overlaps with another block
      }
    }

    // Buffer after
    const afterEnd = this.addMinutes(params.bookingEndTime, bufferMins);
    if (afterEnd <= this.DAY_END) {
      try {
        await this.insert('vehicle_availability_blocks', {
          vehicle_id: params.vehicleId,
          block_date: params.date,
          start_time: params.bookingEndTime,
          end_time: afterEnd,
          block_type: 'buffer',
          booking_id: params.bookingId,
          notes: 'Post-booking buffer',
          created_at: new Date()
        });
      } catch {
        // Ignore if overlaps with another block
      }
    }
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all blocks for a vehicle on a date
   */
  async getVehicleBlocks(
    vehicleId: number,
    date: string
  ): Promise<AvailabilityBlock[]> {
    return this.queryMany<AvailabilityBlock>(`
      SELECT * FROM vehicle_availability_blocks
      WHERE vehicle_id = $1 AND block_date = $2
      ORDER BY start_time
    `, [vehicleId, date]);
  }

  /**
   * Get all blocks for a date (across all vehicles)
   * Useful for calendar views
   */
  async getDayBlocks(date: string): Promise<(AvailabilityBlock & {
    vehicle_name: string;
    booking_number?: string;
  })[]> {
    return this.queryMany(`
      SELECT
        vab.*,
        CONCAT(v.make, ' ', v.model) as vehicle_name,
        b.booking_number
      FROM vehicle_availability_blocks vab
      JOIN vehicles v ON v.id = vab.vehicle_id
      LEFT JOIN bookings b ON b.id = vab.booking_id
      WHERE vab.block_date = $1
      ORDER BY v.id, vab.start_time
    `, [date]);
  }

  /**
   * Get blocks for a date range (for calendar views)
   */
  async getBlocksInRange(
    startDate: string,
    endDate: string,
    vehicleId?: number
  ): Promise<(AvailabilityBlock & { vehicle_name: string })[]> {
    let query = `
      SELECT
        vab.*,
        CONCAT(v.make, ' ', v.model) as vehicle_name
      FROM vehicle_availability_blocks vab
      JOIN vehicles v ON v.id = vab.vehicle_id
      WHERE vab.block_date >= $1 AND vab.block_date <= $2
    `;
    const params: unknown[] = [startDate, endDate];

    if (vehicleId) {
      query += ` AND vab.vehicle_id = $${params.length + 1}`;
      params.push(vehicleId);
    }

    query += ` ORDER BY vab.block_date, v.id, vab.start_time`;

    return this.queryMany(query, params);
  }

  /**
   * Get available time slots for a date
   * Returns hourly slots with availability status
   */
  async getAvailableSlots(params: {
    date: string;
    durationHours: number;
    partySize: number;
    brandId?: number;
  }): Promise<TimeSlot[]> {
    const { date, durationHours, partySize, brandId } = params;
    const slots: TimeSlot[] = [];

    // Generate hourly slots from operating start to latest possible start
    let currentTime = this.DAY_START;
    const latestStart = this.subtractHours(this.DAY_END, durationHours);

    while (this.timeToMinutes(currentTime) <= this.timeToMinutes(latestStart)) {
      const endTime = this.addHours(currentTime, durationHours);

      const availability = await this.checkAvailability({
        date,
        startTime: currentTime,
        durationHours,
        partySize,
        brandId
      });

      slots.push({
        start: currentTime,
        end: endTime,
        available: availability.available,
        vehicle_id: availability.vehicle_id || undefined,
        vehicle_name: availability.vehicle_name || undefined
      });

      // Move to next hour
      currentTime = this.addHours(currentTime, 1);
    }

    return slots;
  }

  /**
   * Delete a block by ID
   */
  async deleteBlock(blockId: number): Promise<void> {
    const block = await this.queryOne<AvailabilityBlock>(
      'SELECT * FROM vehicle_availability_blocks WHERE id = $1',
      [blockId]
    );

    if (!block) {
      throw new NotFoundError('Availability block', blockId.toString());
    }

    // Don't allow deleting booking blocks directly
    if (block.block_type === 'booking' && block.booking_id) {
      throw new ValidationError('Cannot delete booking blocks directly. Cancel the booking instead.');
    }

    await this.delete('vehicle_availability_blocks', blockId);
  }

  /**
   * Delete all blocks associated with a booking
   * Called when a booking is cancelled
   */
  async deleteBookingBlocks(bookingId: number): Promise<void> {
    await this.query(
      'DELETE FROM vehicle_availability_blocks WHERE booking_id = $1',
      [bookingId]
    );
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private addHours(time: string, hours: number): string {
    return this.minutesToTime(this.timeToMinutes(time) + hours * 60);
  }

  private subtractHours(time: string, hours: number): string {
    return this.minutesToTime(this.timeToMinutes(time) - hours * 60);
  }

  private addMinutes(time: string, minutes: number): string {
    return this.minutesToTime(this.timeToMinutes(time) + minutes);
  }

  private subtractMinutes(time: string, minutes: number): string {
    return this.minutesToTime(this.timeToMinutes(time) - minutes);
  }

  private isWithinOperatingHours(start: string, end: string): boolean {
    const startMins = this.timeToMinutes(start);
    const endMins = this.timeToMinutes(end);
    const dayStartMins = this.timeToMinutes(this.DAY_START);
    const dayEndMins = this.timeToMinutes(this.DAY_END);

    return startMins >= dayStartMins && endMins <= dayEndMins;
  }
}

// Export singleton instance
export const vehicleAvailabilityService = new VehicleAvailabilityService();
