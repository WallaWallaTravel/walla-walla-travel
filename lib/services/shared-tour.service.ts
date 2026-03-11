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
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SHARED_TOUR_RATES } from '@/lib/types/pricing-models';
import { logger } from '@/lib/logger';
import { vehicleAvailabilityService } from './vehicle-availability.service';
import { getBrandStripeClient, getBrandStripePublishableKey } from '@/lib/stripe-brands';

// Shared tours use the default Stripe account (NW Touring)
function getStripe() {
  const client = getBrandStripeClient();
  if (!client) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return client;
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/**
 * Serialize raw query results: Date → ISO string, Decimal → number, BigInt → number
 * Ensures compatibility with existing interfaces that expect string dates and numeric values.
 */
function serialize<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(row => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        result[key] = value;
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (typeof value === 'bigint') {
        result[key] = Number(value);
      } else if (typeof value === 'object' && value !== null && 'toFixed' in value) {
        // Prisma Decimal
        result[key] = Number(String(value));
      } else {
        result[key] = value;
      }
    }
    return result as T;
  });
}

function serializeOne<T>(rows: Record<string, unknown>[]): T | null {
  const serialized = serialize<T>(rows);
  return serialized[0] || null;
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
  guest_profile_id: number | null;
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
  publishableKey: string;
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tours_availability_view
      ORDER BY tour_date, start_time
    `;
    return serialize<SharedTourWithAvailability>(rows);
  },

  /**
   * Get a single tour by ID
   */
  async getTourById(tourId: string): Promise<SharedTourSchedule | null> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_schedule
      WHERE id = ${parseInt(tourId)}
    `;
    return serializeOne<SharedTourSchedule>(rows);
  },

  /**
   * Get a tour with availability info
   */
  async getTourWithAvailability(tourId: string): Promise<SharedTourWithAvailability | null> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tours_availability_view
      WHERE id = ${parseInt(tourId)}
    `;
    return serializeOne<SharedTourWithAvailability>(rows);
  },

  /**
   * Get tours for a specific date range
   */
  async getToursInRange(startDate: string, endDate: string): Promise<SharedTourWithAvailability[]> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tours_availability_view
      WHERE tour_date >= ${startDate}::date AND tour_date <= ${endDate}::date
      ORDER BY tour_date, start_time
    `;
    return serialize<SharedTourWithAvailability>(rows);
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
    return prisma.$transaction(async (tx) => {
      // Create the tour record
      const tourRow = await tx.shared_tours.create({
        data: {
          tour_code: tourCode,
          tour_date: new Date(data.tour_date),
          start_time: new Date(`1970-01-01T${startTime}`),
          duration_hours: durationHours,
          max_guests: maxGuests,
          min_guests: data.min_guests || 2,
          price_per_person: data.base_price_per_person || SHARED_TOUR_RATES.base.perPersonRate,
          lunch_included: data.lunch_included_default ?? true,
          title: data.title || 'Walla Walla Wine Tour Experience',
          description: data.description || null,
          pickup_location: data.meeting_location || 'Downtown Walla Walla - exact location provided upon booking',
          planned_wineries: data.wineries_preview || [],
          published: data.is_published ?? true,
          notes: data.notes || null,
          vehicle_id: assignedVehicle?.id || null,
          driver_id: data.driver_id || null,
          status: 'scheduled',
        },
      });

      // Create vehicle availability block if vehicle assigned (still in transaction)
      if (assignedVehicle) {
        try {
          const endTime = this.addHoursToTime(startTime, durationHours);
          await tx.$executeRaw`
            INSERT INTO vehicle_availability_blocks (
              vehicle_id, block_date, start_time, end_time, block_type, notes
            ) VALUES (
              ${assignedVehicle.id},
              ${data.tour_date}::date,
              ${startTime}::time,
              ${endTime}::time,
              'maintenance',
              ${'Shared Tour: ' + (data.title || 'Walla Walla Wine Tour Experience')}
            )
          `;
        } catch (blockError) {
          logger.error('Failed to create vehicle block, transaction will rollback', {
            tourId: tourRow.id,
            vehicleId: assignedVehicle.id,
            error: blockError,
          });
          throw new Error('Failed to reserve vehicle for tour. The vehicle may have just been booked by another tour.');
        }
      }

      // Query via view to get the properly mapped result
      const tourResult = await tx.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM shared_tour_schedule WHERE id = ${tourRow.id}
      `;
      const tour = serializeOne<SharedTourSchedule>(tourResult)!;

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
    const id = parseInt(tourId);

    // Build Prisma update data, mapping view column names to actual table columns
    const updateData: Prisma.shared_toursUpdateInput = {};
    let hasUpdates = false;

    if (data.tour_date !== undefined) {
      updateData.tour_date = new Date(data.tour_date);
      hasUpdates = true;
    }
    if (data.start_time !== undefined) {
      updateData.start_time = new Date(`1970-01-01T${data.start_time}`);
      hasUpdates = true;
    }
    if (data.duration_hours !== undefined) {
      updateData.duration_hours = data.duration_hours;
      hasUpdates = true;
    }
    if (data.max_guests !== undefined) {
      updateData.max_guests = data.max_guests;
      hasUpdates = true;
    }
    if (data.min_guests !== undefined) {
      updateData.min_guests = data.min_guests;
      hasUpdates = true;
    }
    if (data.base_price_per_person !== undefined) {
      updateData.price_per_person = data.base_price_per_person;
      hasUpdates = true;
    }
    if (data.lunch_included_default !== undefined) {
      updateData.lunch_included = data.lunch_included_default;
      hasUpdates = true;
    }
    if (data.title !== undefined) {
      updateData.title = data.title;
      hasUpdates = true;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
      hasUpdates = true;
    }
    if (data.meeting_location !== undefined) {
      updateData.pickup_location = data.meeting_location;
      hasUpdates = true;
    }
    if (data.wineries_preview !== undefined) {
      updateData.planned_wineries = data.wineries_preview;
      hasUpdates = true;
    }
    if (data.is_published !== undefined) {
      updateData.published = data.is_published;
      hasUpdates = true;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
      hasUpdates = true;
    }
    if (data.vehicle_id !== undefined) {
      updateData.vehicle_id = data.vehicle_id;
      hasUpdates = true;
    }
    if (data.driver_id !== undefined) {
      updateData.driver_id = data.driver_id;
      hasUpdates = true;
    }

    // Handle trip_proposal_id separately (not in CreateTourRequest type)
    const tripProposalIdValue = (data as Record<string, unknown>).trip_proposal_id;
    if (tripProposalIdValue !== undefined) {
      updateData.trip_proposal_id = tripProposalIdValue as number | null;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return this.getTourById(tourId);
    }

    // Get current tour state before update (for vehicle change handling)
    const currentTour = await this.getTourById(tourId);

    updateData.updated_at = new Date();

    await prisma.shared_tours.update({
      where: { id },
      data: updateData,
    });

    // Re-query via view
    const updatedTour = await this.getTourById(tourId);
    if (!updatedTour) return null;

    // Handle vehicle assignment changes
    if (data.vehicle_id !== undefined && currentTour) {
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
    const id = parseInt(tourId);

    // Get tour before cancelling to remove vehicle block
    const tour = await this.getTourById(tourId);

    await prisma.shared_tours.update({
      where: { id },
      data: {
        status: 'cancelled',
        updated_at: new Date(),
      },
    });

    // Remove vehicle availability block if vehicle was assigned
    if (tour?.vehicle_id) {
      await this.removeVehicleBlock(tour);
    }

    return this.getTourById(tourId);
  },

  /**
   * Assign driver and vehicle to a tour
   * Creates/updates vehicle availability block
   */
  async assignResources(tourId: string, driverId: string | null, vehicleId: string | null): Promise<SharedTourSchedule | null> {
    const id = parseInt(tourId);

    // Get current tour state
    const currentTour = await this.getTourById(tourId);
    if (!currentTour) return null;

    await prisma.shared_tours.update({
      where: { id },
      data: {
        driver_id: driverId ? parseInt(driverId) : null,
        vehicle_id: vehicleId ? parseInt(vehicleId) : null,
        updated_at: new Date(),
      },
    });

    const updatedTour = await this.getTourById(tourId);
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
    const vehicles = await prisma.vehicles.findMany({
      where: {
        status: 'active',
        capacity: { gte: 2 },
      },
      orderBy: { capacity: 'desc' },
      select: { id: true, make: true, model: true, capacity: true },
    });

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
        capacity: vehicle.capacity ?? 0,
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

    const id = parseInt(tourId);

    // Use transaction to ensure all operations succeed or fail together
    return prisma.$transaction(async (tx) => {
      // Step 1: Remove old vehicle block (if exists)
      if (previousVehicleId) {
        const endTime = this.addHoursToTime(currentTour.start_time, currentTour.duration_hours);
        await tx.$executeRaw`
          DELETE FROM vehicle_availability_blocks
          WHERE vehicle_id = ${parseInt(previousVehicleId)}
            AND block_date = ${currentTour.tour_date}::date
            AND start_time = ${currentTour.start_time}::time
            AND end_time = ${endTime}::time
            AND block_type = 'maintenance'
            AND notes LIKE 'Shared Tour:%'
        `;

        logger.info('Removed old vehicle block in transaction', {
          tourId,
          previousVehicleId,
        });
      }

      // Step 2: Update tour with new vehicle and max_guests
      await tx.shared_tours.update({
        where: { id },
        data: {
          vehicle_id: selectedVehicle!.id,
          max_guests: newMaxGuests,
          updated_at: new Date(),
        },
      });

      // Step 3: Create new vehicle block
      const updatedTourRows = await tx.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM shared_tour_schedule WHERE id = ${id}
      `;
      const updatedTour = serializeOne<SharedTourSchedule>(updatedTourRows)!;

      const endTime = this.addHoursToTime(updatedTour.start_time, updatedTour.duration_hours);
      await tx.$executeRaw`
        INSERT INTO vehicle_availability_blocks (
          vehicle_id, block_date, start_time, end_time, block_type, notes
        ) VALUES (
          ${selectedVehicle!.id},
          ${updatedTour.tour_date}::date,
          ${updatedTour.start_time}::time,
          ${endTime}::time,
          'maintenance',
          ${'Shared Tour: ' + updatedTour.title}
        )
      `;

      logger.info('Reassigned vehicle for shared tour (atomic transaction)', {
        tourId,
        previousVehicleId,
        newVehicleId: selectedVehicle!.id,
        newVehicleName: selectedVehicle!.name,
        maxGuestsUpdated,
        newMaxGuests,
      });

      return {
        tour: updatedTour,
        vehicle_info: selectedVehicle!,
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM check_shared_tour_availability(${parseInt(tourId)}, ${requestedTickets})
    `;
    return serializeOne<{ available: boolean; spots_remaining: number; reason: string }>(rows)!;
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM calculate_ticket_price(${parseInt(tourId)}, ${ticketCount}, ${includesLunch})
    `;
    return serializeOne<{ price_per_person: number; subtotal: number; tax_amount: number; total_amount: number }>(rows)!;
  },

  /**
   * Create a ticket purchase
   *
   * CRITICAL: Uses atomic transaction with row-level locking to prevent race conditions.
   * The SELECT ... FOR UPDATE ensures only one concurrent request can book the last spots.
   */
  async createTicket(data: CreateTicketRequest): Promise<SharedTourTicket> {
    const includesLunch = data.includes_lunch ?? true;
    const tourId = parseInt(data.tour_id);

    // Use atomic transaction to prevent race conditions (overbooking)
    return prisma.$transaction(async (tx) => {
      // Step 1: Lock the tour row and get current availability atomically
      const tourLock = await tx.$queryRaw<Record<string, unknown>[]>`
        SELECT id, max_guests, status, tour_date::text, start_time::text,
               COALESCE(booking_cutoff_hours, 48) as booking_cutoff_hours
        FROM shared_tours
        WHERE id = ${tourId}
        FOR UPDATE
      `;

      const tour = tourLock[0] as { id: number; max_guests: number; status: string; tour_date: string; start_time: string; booking_cutoff_hours: number } | undefined;
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
      const ticketCountResult = await tx.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(guest_count), 0)::INTEGER as total
        FROM shared_tours_tickets
        WHERE shared_tour_id = ${tourId} AND status != 'cancelled'
      `;

      const currentTickets = ticketCountResult[0]?.total || 0;
      const spotsRemaining = tour.max_guests - currentTickets;

      if (data.ticket_count > spotsRemaining) {
        if (spotsRemaining === 0) {
          throw new Error('Tour is sold out');
        }
        throw new Error(`Only ${spotsRemaining} spots remaining on this tour`);
      }

      // Step 4: Calculate price (read-only, safe in transaction)
      const pricingResult = await tx.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM calculate_ticket_price(${tourId}, ${data.ticket_count}, ${includesLunch})
      `;
      const pricing = serializeOne<{ price_per_person: number; subtotal: number; tax_amount: number; total_amount: number }>(pricingResult)!;

      // Step 5: Insert ticket into actual table (not view)
      // ticket_number is auto-generated by database trigger (set_ticket_number)
      const guestNamesJson = data.guest_names ? JSON.stringify(data.guest_names) : null;
      const lunchSelectionsJson = data.guest_lunch_selections ? JSON.stringify(data.guest_lunch_selections) : null;

      const insertedRows = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO shared_tours_tickets (
          shared_tour_id, guest_count, primary_guest_name, primary_guest_email,
          primary_guest_phone, additional_guests, lunch_included, price_per_person,
          total_price, tax_amount, final_total, dietary_restrictions, special_requests,
          referral_source, promo_code, hotel_partner_id, booked_by_hotel,
          lunch_selection, guest_lunch_selections
        ) VALUES (
          ${tourId}, ${data.ticket_count}, ${data.customer_name}, ${data.customer_email},
          ${data.customer_phone || null}, ${guestNamesJson}::jsonb, ${includesLunch}, ${pricing.price_per_person},
          ${pricing.subtotal}, ${pricing.tax_amount}, ${pricing.total_amount},
          ${data.dietary_restrictions || null}, ${data.special_requests || null},
          ${data.referral_source || null}, ${data.promo_code || null},
          ${data.hotel_partner_id ? parseInt(data.hotel_partner_id) : null},
          ${data.booked_by_hotel || false},
          ${data.lunch_selection || null}, ${lunchSelectionsJson}::jsonb
        )
        RETURNING id
      `;
      const ticketRow = insertedRows[0];

      // Step 6: Update tour status if now full (still in transaction)
      const newTotal = currentTickets + data.ticket_count;
      if (newTotal >= tour.max_guests) {
        await tx.shared_tours.update({
          where: { id: tourId },
          data: { status: 'full', updated_at: new Date() },
        });
      }

      // Query via view to get the properly mapped result
      const ticketResult = await tx.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM shared_tour_tickets WHERE id = ${ticketRow.id}
      `;
      const ticket = serializeOne<SharedTourTicket>(ticketResult)!;

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
   * Link a guest profile to a ticket
   */
  async linkGuestProfile(ticketId: string, guestProfileId: number): Promise<void> {
    // guest_profile_id may not be in the Prisma model, use raw SQL
    await prisma.$executeRaw`
      UPDATE shared_tours_tickets SET guest_profile_id = ${guestProfileId} WHERE id = ${parseInt(ticketId)}
    `;
  },

  /**
   * Get tickets for a tour
   */
  async getTicketsForTour(tourId: string): Promise<SharedTourTicket[]> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_tickets
      WHERE tour_id = ${parseInt(tourId)}
      ORDER BY created_at
    `;
    return serialize<SharedTourTicket>(rows);
  },

  /**
   * Get a ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SharedTourTicket | null> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_tickets
      WHERE id = ${parseInt(ticketId)}
    `;
    return serializeOne<SharedTourTicket>(rows);
  },

  /**
   * Get a ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<SharedTourTicket | null> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_tickets
      WHERE ticket_number = ${ticketNumber}
    `;
    return serializeOne<SharedTourTicket>(rows);
  },

  /**
   * Get tickets by customer email
   */
  async getTicketsByEmail(email: string): Promise<SharedTourTicket[]> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_tickets
      WHERE customer_email = ${email}
      ORDER BY created_at DESC
    `;
    return serialize<SharedTourTicket>(rows);
  },

  /**
   * Mark ticket as paid
   */
  async markTicketPaid(ticketId: string, paymentMethod: string, stripePaymentIntentId?: string): Promise<SharedTourTicket | null> {
    const id = parseInt(ticketId);
    await prisma.shared_tours_tickets.update({
      where: { id },
      data: {
        payment_status: 'paid',
        payment_intent_id: stripePaymentIntentId || null,
        updated_at: new Date(),
      },
    });
    return this.getTicketById(ticketId);
  },

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string, reason: string, refundAmount?: number): Promise<SharedTourTicket | null> {
    const id = parseInt(ticketId);
    await prisma.shared_tours_tickets.update({
      where: { id },
      data: {
        status: 'cancelled',
        payment_status: refundAmount != null ? 'refunded' : undefined,
        cancelled_at: new Date(),
        cancellation_reason: reason,
        refund_amount: refundAmount ?? undefined,
        updated_at: new Date(),
      },
    });
    return this.getTicketById(ticketId);
  },

  /**
   * Check in a ticket
   */
  async checkInTicket(ticketId: string): Promise<SharedTourTicket | null> {
    const id = parseInt(ticketId);
    await prisma.shared_tours_tickets.update({
      where: { id },
      data: {
        status: 'attended',
        checked_in_at: new Date(),
        updated_at: new Date(),
      },
    });
    return this.getTicketById(ticketId);
  },

  /**
   * Get guest manifest for a tour
   */
  async getTourManifest(tourId: string): Promise<Record<string, unknown>[]> {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_manifest
      WHERE tour_id = ${parseInt(tourId)}
      ORDER BY customer_name
    `;
    return serialize<Record<string, unknown>>(rows);
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        COUNT(*)::INTEGER as total_tours,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(guest_count), 0) FROM shared_tours_tickets WHERE shared_tour_id = st.id AND status = 'confirmed' AND payment_status = 'paid')
        ), 0)::INTEGER as total_tickets_sold,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(total_price), 0) FROM shared_tours_tickets WHERE shared_tour_id = st.id AND payment_status = 'paid')
        ), 0)::DECIMAL as total_revenue,
        ROUND(
          COALESCE(AVG(
            (SELECT COALESCE(SUM(guest_count), 0) FROM shared_tours_tickets WHERE shared_tour_id = st.id AND status = 'confirmed' AND payment_status = 'paid')
          ), 0), 1
        )::DECIMAL as average_guests_per_tour,
        COUNT(*) FILTER (WHERE st.status = 'completed')::INTEGER as tours_that_ran,
        COUNT(*) FILTER (WHERE st.status = 'cancelled')::INTEGER as cancelled_tours
      FROM shared_tours st
      WHERE st.tour_date >= ${startDate}::date AND st.tour_date <= ${endDate}::date
    `;
    return serializeOne<{
      total_tours: number;
      total_tickets_sold: number;
      total_revenue: number;
      average_guests_per_tour: number;
      tours_that_ran: number;
      cancelled_tours: number;
    }>(rows)!;
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
      await prisma.shared_tours_tickets.update({
        where: { id: parseInt(ticketId) },
        data: {
          payment_intent_id: paymentIntent.id,
          updated_at: new Date(),
        },
      });

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
        publishableKey: getBrandStripePublishableKey(),
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
        publishableKey: getBrandStripePublishableKey(),
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_tickets
      WHERE stripe_payment_intent_id = ${paymentIntentId}
    `;
    const ticket = serializeOne<SharedTourTicket>(rows);

    if (!ticket) {
      logger.warn('No ticket found for payment intent', { paymentIntentId });
      return null;
    }

    // IDEMPOTENCY CHECK: If already paid, return existing ticket
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_tickets
      WHERE stripe_payment_intent_id = ${paymentIntentId}
    `;
    const ticket = serializeOne<SharedTourTicket>(rows);

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
    const tour = await prisma.shared_tours.findUnique({
      where: { id: parseInt(tourId) },
      select: { lunch_menu_options: true },
    });

    if (!tour) {
      return [];
    }

    const options = tour.lunch_menu_options;
    return Array.isArray(options) ? options as Array<{ id: string; name: string; description?: string; dietary?: string[] }> : [];
  },

  /**
   * Update lunch menu options for a tour
   */
  async updateLunchMenuOptions(
    tourId: string,
    options: Array<{ id: string; name: string; description?: string; dietary?: string[] }>
  ): Promise<void> {
    await prisma.shared_tours.update({
      where: { id: parseInt(tourId) },
      data: {
        lunch_menu_options: options as unknown as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });
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
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM shared_tour_lunch_summary WHERE tour_id = ${parseInt(tourId)}
    `;

    if (!rows[0]) {
      return { total_guests_with_lunch: 0, selections: {}, details: [] };
    }

    const summary = rows[0] as {
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
      total_guests_with_lunch: Number(summary.guests_with_lunch) || 0,
      selections,
      details,
    };
  },
};

export default sharedTourService;
