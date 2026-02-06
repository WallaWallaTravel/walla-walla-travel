/**
 * Shared Tour Service
 *
 * @module lib/services/shared-tour.service
 * @description Manages the shared/group wine tour program with ticketed sales.
 * Allows individual guests to join scheduled group tours at per-person pricing.
 *
 * @businessRules
 * - Tours available Sunday-Wednesday only
 * - Per-person pricing: $95 base, $115 with lunch option
 * - Maximum capacity per tour (typically 12-14 guests)
 * - Ticketed sales model (vs private charter)
 *
 * @features
 * - Tour schedule management
 * - Ticket sales and availability tracking
 * - Lunch upgrade options
 * - Guest manifest generation
 *
 * @see migrations/038-shared-tours-system.sql - Database schema
 */

import { query } from '@/lib/db';
import { withTransaction, queryOne } from '@/lib/db-helpers';
import { SHARED_TOUR_RATES } from '@/lib/types/pricing-models';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { vehicleAvailabilityService } from './vehicle-availability.service';
import type { PoolClient } from 'pg';

// Lazy-load Stripe client
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }
  return stripeClient;
}

// ============================================================================
// TYPES
// ============================================================================

export interface SharedTourSchedule {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  max_guests: number;
  min_guests: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  lunch_included_default: boolean;
  title: string;
  description: string | null;
  meeting_location: string | null;
  wineries_preview: string[] | null;
  status: 'open' | 'full' | 'confirmed' | 'cancelled' | 'completed';
  is_published: boolean;
  booking_cutoff_hours: number;
  cancellation_cutoff_hours: number;
  driver_id: string | null;
  vehicle_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharedTourWithAvailability extends SharedTourSchedule {
  tickets_sold: number;
  spots_available: number;
  revenue: number;
  minimum_met: boolean;
  booking_cutoff_at: string;
  accepting_bookings: boolean;
}

export interface SharedTourTicket {
  id: string;
  tour_id: string;
  ticket_number: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  guest_names: string[] | null;
  includes_lunch: boolean;
  lunch_selection: string | null;
  guest_lunch_selections: Array<{ guest_name: string; selection: string }> | null;
  price_per_person: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'partial_refund';
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  status: 'confirmed' | 'cancelled' | 'no_show' | 'attended';
  check_in_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  dietary_restrictions: string | null;
  special_requests: string | null;
  referral_source: string | null;
  promo_code: string | null;
  hotel_partner_id: string | null;
  booked_by_hotel: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketRequest {
  tour_id: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  guest_names?: string[];
  includes_lunch?: boolean;
  lunch_selection?: string;
  guest_lunch_selections?: Array<{ guest_name: string; selection: string }>;
  dietary_restrictions?: string;
  special_requests?: string;
  referral_source?: string;
  promo_code?: string;
  hotel_partner_id?: string;
  booked_by_hotel?: boolean;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

export interface CreateTourRequest {
  tour_date: string;
  start_time?: string;
  duration_hours?: number;
  max_guests?: number;
  min_guests?: number;
  base_price_per_person?: number;
  lunch_price_per_person?: number;
  lunch_included_default?: boolean;
  title?: string;
  description?: string;
  meeting_location?: string;
  wineries_preview?: string[];
  booking_cutoff_hours?: number;
  is_published?: boolean;
  notes?: string;
  vehicle_id?: number;
  driver_id?: number;
  /** If true, auto-assign best available vehicle (default: true) */
  auto_assign_vehicle?: boolean;
  /** If true, require vehicle assignment - fail if none available (default: true) */
  require_vehicle?: boolean;
}

export interface VehicleInfo {
  id: number;
  name: string;
  capacity: number;
  available: boolean;
}

export interface CreateTourResult {
  tour: SharedTourSchedule;
  vehicle_assigned: boolean;
  vehicle_info: VehicleInfo | null;
  max_guests_locked_to_capacity: boolean;
}

// ============================================================================
// TOUR SCHEDULE OPERATIONS
// ============================================================================

export const sharedTourService = {
  /**
   * Get all upcoming shared tours with availability info
   */
  async getUpcomingTours(): Promise<SharedTourWithAvailability[]> {
    const result = await query<SharedTourWithAvailability>(`
      SELECT * FROM shared_tours_availability_view
      ORDER BY tour_date, start_time
    `);
    return result.rows;
  },

  /**
   * Get a single tour by ID
   */
  async getTourById(tourId: string): Promise<SharedTourSchedule | null> {
    const result = await query<SharedTourSchedule>(`
      SELECT * FROM shared_tour_schedule
      WHERE id = $1
    `, [tourId]);
    return result.rows[0] || null;
  },

  /**
   * Get a tour with availability info
   */
  async getTourWithAvailability(tourId: string): Promise<SharedTourWithAvailability | null> {
    const result = await query<SharedTourWithAvailability>(`
      SELECT * FROM shared_tours_availability
      WHERE id = $1
    `, [tourId]);
    return result.rows[0] || null;
  },

  /**
   * Get tours for a specific date range
   */
  async getToursInRange(startDate: string, endDate: string): Promise<SharedTourWithAvailability[]> {
    const result = await query<SharedTourWithAvailability>(`
      SELECT * FROM shared_tours_availability_view
      WHERE tour_date >= $1 AND tour_date <= $2
      ORDER BY tour_date, start_time
    `, [startDate, endDate]);
    return result.rows;
  },

  /**
   * Create a new shared tour date with intelligent vehicle assignment
   *
   * Vehicle Assignment Logic:
   * 1. If vehicle_id provided, verify it's available and use it
   * 2. If auto_assign_vehicle=true (default), find best available vehicle
   * 3. If require_vehicle=true (default), fail if no vehicle available
   * 4. Lock max_guests to vehicle capacity (cannot exceed it)
   *
   * CRITICAL: Uses atomic transaction to prevent orphaned tours if vehicle block creation fails.
   *
   * @throws Error if require_vehicle=true and no vehicles available
   */
  async createTour(data: CreateTourRequest): Promise<CreateTourResult> {
    const startTime = data.start_time || '10:00:00';
    const durationHours = data.duration_hours || 6;
    const autoAssign = data.auto_assign_vehicle !== false; // default true
    const requireVehicle = data.require_vehicle !== false; // default true

    let assignedVehicle: VehicleInfo | null = null;
    let maxGuests = data.max_guests || 14;
    let maxGuestsLockedToCapacity = false;

    // Step 1: Determine vehicle assignment (pre-transaction checks)
    if (data.vehicle_id) {
      // Explicit vehicle provided - verify it's available
      const vehicleAvailability = await this.getAvailableVehicles(
        data.tour_date,
        startTime,
        durationHours
      );
      const vehicle = vehicleAvailability.find(v => v.id === data.vehicle_id);

      if (!vehicle) {
        throw new Error(`Vehicle ID ${data.vehicle_id} not found in active fleet`);
      }

      if (!vehicle.available) {
        throw new Error(`Vehicle "${vehicle.name}" is not available for this date/time slot`);
      }

      assignedVehicle = vehicle;
      // Lock max_guests to vehicle capacity
      if (maxGuests > vehicle.capacity) {
        maxGuests = vehicle.capacity;
        maxGuestsLockedToCapacity = true;
      }
    } else if (autoAssign) {
      // Auto-assign best available vehicle
      const availableVehicles = await this.getAvailableVehicles(
        data.tour_date,
        startTime,
        durationHours
      );

      const available = availableVehicles.filter(v => v.available);

      if (available.length === 0) {
        if (requireVehicle) {
          throw new Error(
            'No vehicles available for this date/time. All vehicles are already assigned to other tours or maintenance.'
          );
        }
        // Continue without vehicle if not required
        logger.warn('Creating shared tour without vehicle assignment', {
          date: data.tour_date,
          startTime,
        });
      } else {
        // Pick the largest available vehicle for shared tours (prefer more capacity)
        const bestVehicle = available.sort((a, b) => b.capacity - a.capacity)[0];
        assignedVehicle = bestVehicle;

        // Lock max_guests to vehicle capacity
        if (maxGuests > bestVehicle.capacity) {
          maxGuests = bestVehicle.capacity;
          maxGuestsLockedToCapacity = true;
        }

        logger.info('Auto-assigned vehicle to shared tour', {
          date: data.tour_date,
          vehicleId: bestVehicle.id,
          vehicleName: bestVehicle.name,
          capacity: bestVehicle.capacity,
        });
      }
    } else if (requireVehicle) {
      // No vehicle provided and auto-assign disabled but vehicle required
      throw new Error('Vehicle assignment is required. Please select a vehicle or enable auto-assignment.');
    }

    // Step 2: Generate unique tour code
    const tourCode = `ST-${data.tour_date.replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    // Step 3: Create tour and vehicle block atomically in a transaction
    // This prevents orphaned tours if vehicle block creation fails
    return withTransaction(async (client: PoolClient) => {
      // Create the tour record (insert into actual table, not view)
      // Note: The shared_tour_schedule view remaps column names, so we use actual table columns
      const result = await client.query<SharedTourSchedule>(`
        INSERT INTO shared_tours (
          tour_code,
          tour_date,
          start_time,
          duration_hours,
          max_guests,
          min_guests,
          price_per_person,
          lunch_included,
          title,
          description,
          pickup_location,
          planned_wineries,
          published,
          notes,
          vehicle_id,
          driver_id,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *,
          price_per_person AS base_price_per_person,
          (price_per_person + 20.00) AS lunch_price_per_person,
          lunch_included AS lunch_included_default,
          pickup_location AS meeting_location,
          planned_wineries AS wineries_preview,
          published AS is_published,
          48 AS booking_cutoff_hours,
          24 AS cancellation_cutoff_hours
      `, [
        tourCode,
        data.tour_date,
        startTime,
        durationHours,
        maxGuests, // Use possibly-capped max_guests
        data.min_guests || 2,
        data.base_price_per_person || SHARED_TOUR_RATES.base.perPersonRate,
        data.lunch_included_default ?? true,
        data.title || 'Walla Walla Wine Tour Experience',
        data.description || null,
        data.meeting_location || 'Downtown Walla Walla - exact location provided upon booking',
        data.wineries_preview || null,
        data.is_published ?? true,
        data.notes || null,
        assignedVehicle?.id || null,
        data.driver_id || null,
        'scheduled', // Default status
      ]);

      const tour = result.rows[0];

      // Create vehicle availability block if vehicle assigned (still in transaction)
      if (assignedVehicle) {
        try {
          // Create vehicle block - uses its own query but we're in a transaction
          // so if this fails, the tour INSERT is rolled back
          await this.createVehicleBlockWithClient(tour, client);
        } catch (blockError) {
          // Log and rethrow - transaction will be rolled back automatically
          logger.error('Failed to create vehicle block, transaction will rollback', {
            tourId: tour.id,
            vehicleId: assignedVehicle.id,
            error: blockError,
          });
          throw new Error('Failed to reserve vehicle for tour. The vehicle may have just been booked by another tour.');
        }
      }

      logger.info('Tour and vehicle block created atomically', {
        tourId: tour.id,
        tourCode,
        vehicleId: assignedVehicle?.id,
        date: data.tour_date,
      });

      return {
        tour,
        vehicle_assigned: !!assignedVehicle,
        vehicle_info: assignedVehicle,
        max_guests_locked_to_capacity: maxGuestsLockedToCapacity,
      };
    });
  },

  /**
   * Simple create tour that returns just the tour (for backward compatibility)
   * @deprecated Use createTour() which returns CreateTourResult
   */
  async createTourSimple(data: CreateTourRequest): Promise<SharedTourSchedule> {
    const result = await this.createTour(data);
    return result.tour;
  },

  /**
   * Create a vehicle availability block for a shared tour
   */
  async createVehicleBlock(tour: SharedTourSchedule): Promise<void> {
    if (!tour.vehicle_id) return;

    const endTime = this.addHoursToTime(tour.start_time, tour.duration_hours);

    try {
      await vehicleAvailabilityService.createMaintenanceBlock({
        vehicleId: parseInt(tour.vehicle_id),
        date: tour.tour_date,
        startTime: tour.start_time,
        endTime,
        reason: `Shared Tour: ${tour.title}`,
      });
      logger.info('Created vehicle availability block for shared tour', {
        tourId: tour.id,
        vehicleId: tour.vehicle_id,
        date: tour.tour_date,
      });
    } catch (error) {
      logger.error('Failed to create vehicle availability block', {
        tourId: tour.id,
        vehicleId: tour.vehicle_id,
        error,
      });
      throw error;
    }
  },

  /**
   * Create a vehicle availability block within an existing transaction
   * This version accepts a PoolClient for transaction safety
   */
  async createVehicleBlockWithClient(tour: SharedTourSchedule, client: PoolClient): Promise<void> {
    if (!tour.vehicle_id) return;

    const endTime = this.addHoursToTime(tour.start_time, tour.duration_hours);

    // Insert directly into vehicle_availability_blocks within the transaction
    await client.query(`
      INSERT INTO vehicle_availability_blocks (
        vehicle_id,
        block_date,
        start_time,
        end_time,
        block_type,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      parseInt(tour.vehicle_id),
      tour.tour_date,
      tour.start_time,
      endTime,
      'maintenance', // Using 'maintenance' type for shared tour blocks
      `Shared Tour: ${tour.title}`,
    ]);

    logger.info('Created vehicle availability block (in transaction) for shared tour', {
      tourId: tour.id,
      vehicleId: tour.vehicle_id,
      date: tour.tour_date,
    });
  },

  /**
   * Helper to add hours to a time string
   */
  addHoursToTime(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`;
  },

  /**
   * Update a tour
   */
  async updateTour(tourId: string, data: Partial<CreateTourRequest>): Promise<SharedTourSchedule | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.tour_date !== undefined) {
      updates.push(`tour_date = $${paramCount++}`);
      values.push(data.tour_date);
    }
    if (data.start_time !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(data.start_time);
    }
    if (data.duration_hours !== undefined) {
      updates.push(`duration_hours = $${paramCount++}`);
      values.push(data.duration_hours);
    }
    if (data.max_guests !== undefined) {
      updates.push(`max_guests = $${paramCount++}`);
      values.push(data.max_guests);
    }
    if (data.min_guests !== undefined) {
      updates.push(`min_guests = $${paramCount++}`);
      values.push(data.min_guests);
    }
    if (data.base_price_per_person !== undefined) {
      updates.push(`base_price_per_person = $${paramCount++}`);
      values.push(data.base_price_per_person);
    }
    if (data.lunch_price_per_person !== undefined) {
      updates.push(`lunch_price_per_person = $${paramCount++}`);
      values.push(data.lunch_price_per_person);
    }
    if (data.lunch_included_default !== undefined) {
      updates.push(`lunch_included_default = $${paramCount++}`);
      values.push(data.lunch_included_default);
    }
    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.meeting_location !== undefined) {
      updates.push(`meeting_location = $${paramCount++}`);
      values.push(data.meeting_location);
    }
    if (data.wineries_preview !== undefined) {
      updates.push(`wineries_preview = $${paramCount++}`);
      values.push(data.wineries_preview);
    }
    if (data.booking_cutoff_hours !== undefined) {
      updates.push(`booking_cutoff_hours = $${paramCount++}`);
      values.push(data.booking_cutoff_hours);
    }
    if (data.is_published !== undefined) {
      updates.push(`is_published = $${paramCount++}`);
      values.push(data.is_published);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }
    if (data.vehicle_id !== undefined) {
      updates.push(`vehicle_id = $${paramCount++}`);
      values.push(data.vehicle_id);
    }
    if (data.driver_id !== undefined) {
      updates.push(`driver_id = $${paramCount++}`);
      values.push(data.driver_id);
    }

    if (updates.length === 0) {
      return this.getTourById(tourId);
    }

    // Get current tour state before update
    const currentTour = await this.getTourById(tourId);

    updates.push(`updated_at = NOW()`);
    values.push(tourId);

    const result = await query<SharedTourSchedule>(`
      UPDATE shared_tour_schedule
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    const updatedTour = result.rows[0];
    if (!updatedTour) return null;

    // Handle vehicle assignment changes
    if (data.vehicle_id !== undefined && currentTour) {
      // If vehicle changed, update availability blocks
      if (currentTour.vehicle_id !== String(data.vehicle_id)) {
        // Remove old block if existed
        if (currentTour.vehicle_id) {
          await this.removeVehicleBlock(currentTour);
        }
        // Create new block if vehicle assigned
        if (data.vehicle_id) {
          await this.createVehicleBlock(updatedTour);
        }
      }
    }

    return updatedTour;
  },

  /**
   * Remove vehicle availability block for a shared tour
   */
  async removeVehicleBlock(tour: SharedTourSchedule): Promise<void> {
    if (!tour.vehicle_id) return;

    const endTime = this.addHoursToTime(tour.start_time, tour.duration_hours);

    try {
      // Find and delete the block
      const blocks = await vehicleAvailabilityService.getVehicleBlocks(
        parseInt(tour.vehicle_id),
        tour.tour_date
      );

      for (const block of blocks) {
        if (
          block.block_type === 'maintenance' &&
          block.start_time === tour.start_time &&
          block.end_time === endTime &&
          block.notes?.includes('Shared Tour')
        ) {
          await vehicleAvailabilityService.deleteBlock(block.id);
          logger.info('Removed vehicle availability block for shared tour', {
            tourId: tour.id,
            vehicleId: tour.vehicle_id,
            blockId: block.id,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to remove vehicle availability block', {
        tourId: tour.id,
        vehicleId: tour.vehicle_id,
        error,
      });
    }
  },

  /**
   * Cancel a tour
   * Also removes the vehicle availability block if a vehicle was assigned
   */
  async cancelTour(tourId: string): Promise<SharedTourSchedule | null> {
    // Get tour before cancelling to remove vehicle block
    const tour = await this.getTourById(tourId);

    const result = await query<SharedTourSchedule>(`
      UPDATE shared_tour_schedule
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [tourId]);

    const cancelledTour = result.rows[0];

    // Remove vehicle availability block if vehicle was assigned
    if (tour?.vehicle_id) {
      await this.removeVehicleBlock(tour);
    }

    return cancelledTour;
  },

  /**
   * Assign driver and vehicle to a tour
   * Creates/updates vehicle availability block
   */
  async assignResources(tourId: string, driverId: string | null, vehicleId: string | null): Promise<SharedTourSchedule | null> {
    // Get current tour state
    const currentTour = await this.getTourById(tourId);
    if (!currentTour) return null;

    const result = await query<SharedTourSchedule>(`
      UPDATE shared_tour_schedule
      SET driver_id = $2, vehicle_id = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [tourId, driverId, vehicleId]);

    const updatedTour = result.rows[0];
    if (!updatedTour) return null;

    // Handle vehicle assignment changes
    if (currentTour.vehicle_id !== vehicleId) {
      // Remove old block if existed
      if (currentTour.vehicle_id) {
        await this.removeVehicleBlock(currentTour);
      }
      // Create new block if vehicle assigned
      if (vehicleId) {
        await this.createVehicleBlock(updatedTour);
      }
    }

    return updatedTour;
  },

  /**
   * Get available vehicles for a shared tour date/time
   * Returns all active vehicles with availability status
   */
  async getAvailableVehicles(date: string, startTime: string, durationHours: number): Promise<VehicleInfo[]> {
    const endTime = this.addHoursToTime(startTime, durationHours);

    // Get all active vehicles with reasonable capacity for shared tours
    const vehiclesResult = await query<{
      id: number;
      make: string;
      model: string;
      capacity: number;
    }>(`
      SELECT id, make, model, capacity
      FROM vehicles
      WHERE status = 'active' AND capacity >= 2
      ORDER BY capacity DESC
    `);

    const vehicles = vehiclesResult.rows;
    if (vehicles.length === 0) return [];

    // Check availability for each vehicle
    const availableVehicles: VehicleInfo[] = [];
    for (const vehicle of vehicles) {
      const { available } = await vehicleAvailabilityService.checkVehicleAvailability(
        vehicle.id,
        date,
        startTime,
        endTime
      );

      availableVehicles.push({
        id: vehicle.id,
        name: `${vehicle.make} ${vehicle.model}`,
        capacity: vehicle.capacity,
        available,
      });
    }

    return availableVehicles;
  },

  /**
   * Get available vehicles for an existing tour (for reassignment)
   * Filters to vehicles with capacity >= current tickets sold
   */
  async getAvailableVehiclesForTour(tourId: string): Promise<{
    vehicles: VehicleInfo[];
    currentTicketsSold: number;
    minimumCapacityRequired: number;
  }> {
    // Get tour with ticket count
    const tourWithAvailability = await this.getTourWithAvailability(tourId);
    if (!tourWithAvailability) {
      throw new Error('Tour not found');
    }

    const ticketsSold = tourWithAvailability.tickets_sold || 0;
    const minimumCapacity = Math.max(ticketsSold, 2); // At least 2 for shared tours

    const allVehicles = await this.getAvailableVehicles(
      tourWithAvailability.tour_date,
      tourWithAvailability.start_time,
      tourWithAvailability.duration_hours
    );

    // Filter to vehicles that can accommodate current bookings
    // Also include the currently assigned vehicle as "available" (it's our block)
    const vehicles = allVehicles.filter(v =>
      v.capacity >= minimumCapacity &&
      (v.available || String(v.id) === tourWithAvailability.vehicle_id)
    ).map(v => ({
      ...v,
      // Mark current vehicle as available since we're already using its block
      available: v.available || String(v.id) === tourWithAvailability.vehicle_id,
    }));

    return {
      vehicles,
      currentTicketsSold: ticketsSold,
      minimumCapacityRequired: minimumCapacity,
    };
  },

  /**
   * Reassign vehicle to a tour (e.g., if original vehicle becomes unavailable)
   * Will attempt to find a suitable replacement automatically if newVehicleId not provided
   *
   * CRITICAL: Uses atomic transaction to prevent partial failures.
   * All operations (remove old block, update tour, create new block) succeed or fail together.
   *
   * @param tourId - The tour to reassign
   * @param newVehicleId - Optional specific vehicle to assign, or auto-select if not provided
   * @returns Updated tour and vehicle info, or throws if no suitable vehicle available
   */
  async reassignVehicle(tourId: string, newVehicleId?: number): Promise<{
    tour: SharedTourSchedule;
    vehicle_info: VehicleInfo;
    max_guests_updated: boolean;
    previous_vehicle_id: string | null;
  }> {
    const currentTour = await this.getTourWithAvailability(tourId);
    if (!currentTour) {
      throw new Error('Tour not found');
    }

    const ticketsSold = currentTour.tickets_sold || 0;
    const { vehicles } = await this.getAvailableVehiclesForTour(tourId);

    let selectedVehicle: VehicleInfo | null = null;

    if (newVehicleId) {
      // Specific vehicle requested
      selectedVehicle = vehicles.find(v => v.id === newVehicleId && v.available) || null;
      if (!selectedVehicle) {
        throw new Error(`Vehicle ID ${newVehicleId} is not available or cannot accommodate ${ticketsSold} guests`);
      }
    } else {
      // Auto-select best available vehicle
      const available = vehicles.filter(v => v.available && v.capacity >= ticketsSold);
      if (available.length === 0) {
        throw new Error(
          `No vehicles available that can accommodate the ${ticketsSold} guests already booked. ` +
          'Consider cancelling some tickets first or resolving vehicle conflicts.'
        );
      }
      // Pick largest available vehicle
      selectedVehicle = available.sort((a, b) => b.capacity - a.capacity)[0];
    }

    const previousVehicleId = currentTour.vehicle_id;
    let maxGuestsUpdated = false;

    // Update max_guests if new vehicle has different capacity
    let newMaxGuests = currentTour.max_guests;
    if (newMaxGuests > selectedVehicle.capacity) {
      newMaxGuests = selectedVehicle.capacity;
      maxGuestsUpdated = true;
    }

    // Validate: new vehicle capacity must accommodate existing tickets
    if (selectedVehicle.capacity < ticketsSold) {
      throw new Error(
        `Cannot reassign to vehicle with capacity ${selectedVehicle.capacity}. ` +
        `Tour already has ${ticketsSold} tickets sold.`
      );
    }

    // Use transaction to ensure all operations succeed or fail together
    return withTransaction(async (client: PoolClient) => {
      // Step 1: Remove old vehicle block (if exists)
      if (previousVehicleId) {
        const endTime = this.addHoursToTime(currentTour.start_time, currentTour.duration_hours);
        await client.query(`
          DELETE FROM vehicle_availability_blocks
          WHERE vehicle_id = $1
            AND block_date = $2
            AND start_time = $3
            AND end_time = $4
            AND block_type = 'maintenance'
            AND notes LIKE 'Shared Tour:%'
        `, [
          parseInt(previousVehicleId),
          currentTour.tour_date,
          currentTour.start_time,
          endTime,
        ]);

        logger.info('Removed old vehicle block in transaction', {
          tourId,
          previousVehicleId,
        });
      }

      // Step 2: Update tour with new vehicle and max_guests
      const updateResult = await client.query<SharedTourSchedule>(`
        UPDATE shared_tours
        SET vehicle_id = $2, max_guests = $3, updated_at = NOW()
        WHERE id = $1
        RETURNING *,
          price_per_person AS base_price_per_person,
          (price_per_person + 20.00) AS lunch_price_per_person,
          lunch_included AS lunch_included_default,
          pickup_location AS meeting_location,
          planned_wineries AS wineries_preview,
          published AS is_published,
          48 AS booking_cutoff_hours,
          24 AS cancellation_cutoff_hours
      `, [tourId, selectedVehicle.id, newMaxGuests]);

      const updatedTour = updateResult.rows[0];
      if (!updatedTour) {
        throw new Error('Failed to update tour with new vehicle');
      }

      // Step 3: Create new vehicle block
      await this.createVehicleBlockWithClient(updatedTour, client);

      logger.info('Reassigned vehicle for shared tour (atomic transaction)', {
        tourId,
        previousVehicleId,
        newVehicleId: selectedVehicle.id,
        newVehicleName: selectedVehicle.name,
        maxGuestsUpdated,
        newMaxGuests,
      });

      return {
        tour: updatedTour,
        vehicle_info: selectedVehicle,
        max_guests_updated: maxGuestsUpdated,
        previous_vehicle_id: previousVehicleId,
      };
    });
  },

  // ============================================================================
  // TICKET OPERATIONS
  // ============================================================================

  /**
   * Check availability for a tour
   */
  async checkAvailability(tourId: string, requestedTickets: number): Promise<{
    available: boolean;
    spots_remaining: number;
    reason: string;
  }> {
    const result = await query<{ available: boolean; spots_remaining: number; reason: string }>(`
      SELECT * FROM check_shared_tour_availability($1, $2)
    `, [tourId, requestedTickets]);
    return result.rows[0];
  },

  /**
   * Calculate ticket price
   */
  async calculatePrice(tourId: string, ticketCount: number, includesLunch: boolean = true): Promise<{
    price_per_person: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
  }> {
    const result = await query<{
      price_per_person: number;
      subtotal: number;
      tax_amount: number;
      total_amount: number;
    }>(`
      SELECT * FROM calculate_ticket_price($1, $2, $3)
    `, [tourId, ticketCount, includesLunch]);
    return result.rows[0];
  },

  /**
   * Create a ticket purchase
   *
   * CRITICAL: Uses atomic transaction with row-level locking to prevent race conditions.
   * The SELECT ... FOR UPDATE ensures only one concurrent request can book the last spots.
   */
  async createTicket(data: CreateTicketRequest): Promise<SharedTourTicket> {
    const includesLunch = data.includes_lunch ?? true;

    // Use atomic transaction to prevent race conditions (overbooking)
    return withTransaction(async (client: PoolClient) => {
      // Step 1: Lock the tour row and get current availability atomically
      // This prevents concurrent requests from both passing availability check
      const tourLock = await client.query<{
        id: string;
        max_guests: number;
        status: string;
        tour_date: string;
        start_time: string;
        booking_cutoff_hours: number;
      }>(`
        SELECT id, max_guests, status, tour_date, start_time,
               COALESCE(booking_cutoff_hours, 48) as booking_cutoff_hours
        FROM shared_tours
        WHERE id = $1
        FOR UPDATE
      `, [data.tour_id]);

      const tour = tourLock.rows[0];
      if (!tour) {
        throw new Error('Tour not found');
      }

      if (tour.status === 'cancelled') {
        throw new Error('Tour has been cancelled');
      }

      if (tour.status === 'full') {
        throw new Error('Tour is already full');
      }

      // Step 2: Check booking cutoff (still within transaction)
      const tourDateTime = new Date(`${tour.tour_date}T${tour.start_time}`);
      const cutoffTime = new Date(tourDateTime.getTime() - (tour.booking_cutoff_hours * 60 * 60 * 1000));
      if (new Date() > cutoffTime) {
        throw new Error('Booking cutoff time has passed for this tour');
      }

      // Step 3: Count current tickets (locked reads prevent phantom reads)
      const ticketCount = await client.query<{ total: number }>(`
        SELECT COALESCE(SUM(ticket_count), 0)::INTEGER as total
        FROM shared_tour_tickets
        WHERE tour_id = $1 AND status != 'cancelled'
      `, [data.tour_id]);

      const currentTickets = ticketCount.rows[0]?.total || 0;
      const spotsRemaining = tour.max_guests - currentTickets;

      if (data.ticket_count > spotsRemaining) {
        if (spotsRemaining === 0) {
          throw new Error('Tour is sold out');
        }
        throw new Error(`Only ${spotsRemaining} spots remaining on this tour`);
      }

      // Step 4: Calculate price (read-only, safe in transaction)
      const pricingResult = await client.query<{
        price_per_person: number;
        subtotal: number;
        tax_amount: number;
        total_amount: number;
      }>(`
        SELECT * FROM calculate_ticket_price($1, $2, $3)
      `, [data.tour_id, data.ticket_count, includesLunch]);

      const pricing = pricingResult.rows[0];

      // Step 5: Insert ticket (still within transaction, atomically)
      const result = await client.query<SharedTourTicket>(`
        INSERT INTO shared_tour_tickets (
          tour_id,
          ticket_count,
          customer_name,
          customer_email,
          customer_phone,
          guest_names,
          includes_lunch,
          price_per_person,
          subtotal,
          tax_amount,
          total_amount,
          dietary_restrictions,
          special_requests,
          referral_source,
          promo_code,
          hotel_partner_id,
          booked_by_hotel
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `, [
        data.tour_id,
        data.ticket_count,
        data.customer_name,
        data.customer_email,
        data.customer_phone || null,
        data.guest_names || null,
        includesLunch,
        pricing.price_per_person,
        pricing.subtotal,
        pricing.tax_amount,
        pricing.total_amount,
        data.dietary_restrictions || null,
        data.special_requests || null,
        data.referral_source || null,
        data.promo_code || null,
        data.hotel_partner_id || null,
        data.booked_by_hotel || false,
      ]);

      const ticket = result.rows[0];

      // Step 6: Update tour status if now full (still in transaction)
      const newTotal = currentTickets + data.ticket_count;
      if (newTotal >= tour.max_guests) {
        await client.query(`
          UPDATE shared_tours SET status = 'full', updated_at = NOW()
          WHERE id = $1
        `, [data.tour_id]);
      }

      logger.info('Ticket created atomically', {
        ticketId: ticket.id,
        tourId: data.tour_id,
        ticketCount: data.ticket_count,
        spotsRemainingAfter: spotsRemaining - data.ticket_count,
      });

      return ticket;
    });
  },

  /**
   * Get tickets for a tour
   */
  async getTicketsForTour(tourId: string): Promise<SharedTourTicket[]> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE tour_id = $1
      ORDER BY created_at
    `, [tourId]);
    return result.rows;
  },

  /**
   * Get a ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE id = $1
    `, [ticketId]);
    return result.rows[0] || null;
  },

  /**
   * Get a ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE ticket_number = $1
    `, [ticketNumber]);
    return result.rows[0] || null;
  },

  /**
   * Get tickets by customer email
   */
  async getTicketsByEmail(email: string): Promise<SharedTourTicket[]> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE customer_email = $1
      ORDER BY created_at DESC
    `, [email]);
    return result.rows;
  },

  /**
   * Mark ticket as paid
   */
  async markTicketPaid(ticketId: string, paymentMethod: string, stripePaymentIntentId?: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      UPDATE shared_tour_tickets
      SET
        payment_status = 'paid',
        payment_method = $2,
        stripe_payment_intent_id = $3,
        paid_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [ticketId, paymentMethod, stripePaymentIntentId || null]);
    return result.rows[0] || null;
  },

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string, reason: string, refundAmount?: number): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      UPDATE shared_tour_tickets
      SET
        status = 'cancelled',
        payment_status = CASE WHEN $3 IS NOT NULL THEN 'refunded' ELSE payment_status END,
        cancelled_at = NOW(),
        cancellation_reason = $2,
        refund_amount = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [ticketId, reason, refundAmount || null]);
    return result.rows[0] || null;
  },

  /**
   * Check in a ticket
   */
  async checkInTicket(ticketId: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      UPDATE shared_tour_tickets
      SET
        status = 'attended',
        check_in_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [ticketId]);
    return result.rows[0] || null;
  },

  /**
   * Get guest manifest for a tour
   */
  async getTourManifest(tourId: string): Promise<Record<string, unknown>[]> {
    const result = await query(`
      SELECT * FROM shared_tour_manifest
      WHERE tour_id = $1
      ORDER BY customer_name
    `, [tourId]);
    return result.rows;
  },

  // ============================================================================
  // REPORTING
  // ============================================================================

  /**
   * Get tour statistics for a date range
   */
  async getTourStats(startDate: string, endDate: string): Promise<{
    total_tours: number;
    total_tickets_sold: number;
    total_revenue: number;
    average_guests_per_tour: number;
    tours_that_ran: number;
    cancelled_tours: number;
  }> {
    const result = await query(`
      SELECT
        COUNT(*)::INTEGER as total_tours,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(ticket_count), 0) FROM shared_tour_tickets WHERE tour_id = st.id AND status = 'confirmed' AND payment_status = 'paid')
        ), 0)::INTEGER as total_tickets_sold,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(total_amount), 0) FROM shared_tour_tickets WHERE tour_id = st.id AND payment_status = 'paid')
        ), 0)::DECIMAL as total_revenue,
        ROUND(
          COALESCE(AVG(
            (SELECT COALESCE(SUM(ticket_count), 0) FROM shared_tour_tickets WHERE tour_id = st.id AND status = 'confirmed' AND payment_status = 'paid')
          ), 0), 1
        )::DECIMAL as average_guests_per_tour,
        COUNT(*) FILTER (WHERE st.status = 'completed')::INTEGER as tours_that_ran,
        COUNT(*) FILTER (WHERE st.status = 'cancelled')::INTEGER as cancelled_tours
      FROM shared_tour_schedule st
      WHERE st.tour_date >= $1 AND st.tour_date <= $2
    `, [startDate, endDate]);
    return result.rows[0];
  },

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  /**
   * Create a Stripe payment intent for a ticket
   *
   * IDEMPOTENT: Uses Stripe's idempotency_key to prevent duplicate charges on client retry.
   * The key is based on ticket_id + amount, so retries get the same payment intent.
   */
  async createPaymentIntent(ticketId: string): Promise<PaymentIntentResult> {
    // Get ticket details
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.payment_status === 'paid') {
      throw new Error('Ticket is already paid');
    }

    // Get tour details for description
    const tour = await this.getTourById(ticket.tour_id);
    if (!tour) {
      throw new Error('Tour not found');
    }

    const stripe = getStripe();
    const amountInCents = Math.round(ticket.total_amount * 100);

    // Generate idempotency key based on ticket ID and amount
    // This ensures retries get the same payment intent, preventing double-charges
    const idempotencyKey = `shared_tour_ticket_${ticketId}_${amountInCents}`;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          type: 'shared_tour_ticket',
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          tour_id: ticket.tour_id,
          customer_email: ticket.customer_email,
          customer_name: ticket.customer_name,
          ticket_count: String(ticket.ticket_count),
        },
        description: `Shared Tour Ticket: ${tour.title} on ${tour.tour_date} - ${ticket.ticket_count} guest(s)`,
        receipt_email: ticket.customer_email,
      }, {
        idempotencyKey, // Prevents duplicate payment intents on retry
      });

      // Update ticket with payment intent ID
      await query(`
        UPDATE shared_tour_tickets
        SET stripe_payment_intent_id = $2, updated_at = NOW()
        WHERE id = $1
      `, [ticketId, paymentIntent.id]);

      logger.info('Payment intent created for shared tour ticket', {
        ticketId,
        paymentIntentId: paymentIntent.id,
        amount: ticket.total_amount,
        idempotencyKey,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: ticket.total_amount,
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { ticketId, error });
      throw new Error('Failed to create payment. Please try again.');
    }
  },

  /**
   * Get the client secret for an existing payment intent
   */
  async getPaymentIntentClientSecret(ticketId: string): Promise<PaymentIntentResult | null> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket || !ticket.stripe_payment_intent_id) {
      return null;
    }

    if (ticket.payment_status === 'paid') {
      throw new Error('Ticket is already paid');
    }

    const stripe = getStripe();
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(ticket.stripe_payment_intent_id);

      // If payment intent is no longer usable, create a new one
      if (paymentIntent.status === 'canceled' || paymentIntent.status === 'succeeded') {
        return this.createPaymentIntent(ticketId);
      }

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: ticket.total_amount,
      };
    } catch {
      // If retrieval fails, create a new payment intent
      return this.createPaymentIntent(ticketId);
    }
  },

  /**
   * Confirm a payment was successful (called by webhook)
   *
   * IDEMPOTENT: If already paid, returns the existing ticket without re-processing.
   * This prevents duplicate confirmation emails when Stripe retries webhooks.
   */
  async confirmPayment(paymentIntentId: string): Promise<SharedTourTicket | null> {
    // Find ticket by payment intent ID
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntentId]);

    const ticket = result.rows[0];
    if (!ticket) {
      logger.warn('No ticket found for payment intent', { paymentIntentId });
      return null;
    }

    // IDEMPOTENCY CHECK: If already paid, return existing ticket
    // This prevents duplicate emails on webhook retries
    if (ticket.payment_status === 'paid') {
      logger.info('Payment already confirmed (idempotent), skipping re-confirmation', {
        ticketId: ticket.id,
        paymentIntentId,
        paidAt: ticket.paid_at,
      });
      return ticket;
    }

    // Mark as paid
    return this.markTicketPaid(ticket.id, 'stripe', paymentIntentId);
  },

  /**
   * Handle failed payment (called by webhook)
   */
  async handlePaymentFailed(paymentIntentId: string, errorMessage?: string): Promise<void> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntentId]);

    const ticket = result.rows[0];
    if (!ticket) {
      logger.warn('No ticket found for failed payment', { paymentIntentId });
      return;
    }

    logger.error('Payment failed for shared tour ticket', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      paymentIntentId,
      errorMessage,
    });

    // Could send notification email here
  },

  /**
   * Create a payment link for email (hotel partner bookings)
   */
  async createPaymentLink(ticketId: string): Promise<string> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${appUrl}/shared-tours/pay/${ticketId}`;
  },

  // ============================================================================
  // LUNCH MENU OPERATIONS
  // ============================================================================

  /**
   * Get lunch menu options for a tour
   */
  async getLunchMenuOptions(tourId: string): Promise<Array<{ id: string; name: string; description?: string; dietary?: string[] }>> {
    const result = await query<{ lunch_menu_options: unknown }>(`
      SELECT lunch_menu_options FROM shared_tours WHERE id = $1
    `, [tourId]);

    if (!result.rows[0]) {
      return [];
    }

    const options = result.rows[0].lunch_menu_options;
    return Array.isArray(options) ? options as Array<{ id: string; name: string; description?: string; dietary?: string[] }> : [];
  },

  /**
   * Update lunch menu options for a tour
   */
  async updateLunchMenuOptions(
    tourId: string,
    options: Array<{ id: string; name: string; description?: string; dietary?: string[] }>
  ): Promise<void> {
    await query(`
      UPDATE shared_tours
      SET lunch_menu_options = $2::jsonb, updated_at = NOW()
      WHERE id = $1
    `, [tourId, JSON.stringify(options)]);
  },

  /**
   * Get lunch order summary for a tour
   */
  async getLunchOrderSummary(tourId: string): Promise<{
    total_guests_with_lunch: number;
    selections: Record<string, number>;
    details: Array<{
      guest_name: string;
      selection: string;
      dietary_restrictions?: string;
    }>;
  }> {
    const result = await query(`
      SELECT * FROM shared_tour_lunch_summary WHERE tour_id = $1
    `, [tourId]);

    if (!result.rows[0]) {
      return { total_guests_with_lunch: 0, selections: {}, details: [] };
    }

    const summary = result.rows[0] as {
      guests_with_lunch: number;
      lunch_details: Array<{
        ticket_id: string;
        guest_count: number;
        lunch_selection: string | null;
        guest_lunch_selections: Array<{ guest_name: string; selection: string }> | null;
        dietary_restrictions: string | null;
      }>;
    };

    // Aggregate selections
    const selections: Record<string, number> = {};
    const details: Array<{ guest_name: string; selection: string; dietary_restrictions?: string }> = [];

    if (summary.lunch_details) {
      for (const ticket of summary.lunch_details) {
        // Count default selection
        if (ticket.lunch_selection) {
          selections[ticket.lunch_selection] = (selections[ticket.lunch_selection] || 0) + 1;
        }

        // Count individual guest selections
        if (ticket.guest_lunch_selections) {
          for (const guest of ticket.guest_lunch_selections) {
            selections[guest.selection] = (selections[guest.selection] || 0) + 1;
            details.push({
              guest_name: guest.guest_name,
              selection: guest.selection,
              dietary_restrictions: ticket.dietary_restrictions || undefined,
            });
          }
        }
      }
    }

    return {
      total_guests_with_lunch: summary.guests_with_lunch || 0,
      selections,
      details,
    };
  },
};

export default sharedTourService;
