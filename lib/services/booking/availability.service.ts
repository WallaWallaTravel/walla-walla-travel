/**
 * Booking Availability Service
 *
 * @module lib/services/booking/availability.service
 * @description Vehicle availability integration for double-booking prevention
 */

import { BaseService } from '../base.service';
import { vehicleAvailabilityService } from '../vehicle-availability.service';
import { ConflictError } from '@/lib/api/middleware/error-handler';
import {
  Booking,
  CreateBookingData,
  AvailabilityCheckParams,
  AvailabilityResult,
  CreateBookingSchema,
} from './types';
import { bookingCoreService } from './core.service';

export class BookingAvailabilityService extends BaseService {
  protected get serviceName(): string {
    return 'BookingAvailabilityService';
  }

  /**
   * Check availability using the vehicle availability service
   */
  async checkBookingAvailability(params: AvailabilityCheckParams): Promise<AvailabilityResult> {
    const result = await vehicleAvailabilityService.checkAvailability(params);

    // Also get available slots for the day if not available
    let availableSlots: Array<{
      start: string;
      end: string;
      available: boolean;
      vehicle_id?: number;
      vehicle_name?: string;
    }> = [];

    if (!result.available) {
      availableSlots = await vehicleAvailabilityService.getAvailableSlots({
        date: params.date,
        durationHours: params.durationHours,
        partySize: params.partySize,
        brandId: params.brandId
      });
    }

    return {
      available: result.available,
      vehicleId: result.vehicle_id,
      vehicleName: result.vehicle_name,
      conflicts: result.conflicts,
      availableSlots
    };
  }

  /**
   * Create a booking with transactional vehicle availability
   * Uses the vehicle_availability_blocks table with exclusion constraint
   * for bulletproof double-booking prevention
   *
   * Flow:
   * 1. Check availability via VehicleAvailabilityService
   * 2. Create HOLD block (constraint enforced)
   * 3. Create booking record
   * 4. Convert HOLD to BOOKING block
   * 5. On failure, release hold
   */
  async createBookingWithAvailability(data: CreateBookingData & {
    vehicleId?: number;
    endTime?: string;
  }): Promise<Booking & { vehicle_id: number }> {
    this.log('Creating booking with availability protection', {
      customerEmail: data.customerEmail,
      tourDate: data.tourDate,
    });

    // Validate data first
    const validated = CreateBookingSchema.parse(data);

    // Calculate end time
    const endTime = data.endTime || bookingCoreService.calculateEndTime(validated.startTime, validated.durationHours);

    // 1. Check availability and find a vehicle
    const availability = await vehicleAvailabilityService.checkAvailability({
      date: validated.tourDate,
      startTime: validated.startTime,
      durationHours: validated.durationHours,
      partySize: validated.partySize,
      brandId: validated.brandId
    });

    if (!availability.available || !availability.vehicle_id) {
      throw new ConflictError(
        availability.conflicts.join('. ') || 'No vehicles available for this time slot'
      );
    }

    const vehicleId = data.vehicleId || availability.vehicle_id;

    // 2. Create hold block - this will throw if there's a race condition
    let holdBlock;
    try {
      holdBlock = await vehicleAvailabilityService.createHoldBlock({
        vehicleId,
        date: validated.tourDate,
        startTime: validated.startTime,
        endTime,
        brandId: validated.brandId
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new Error('Failed to reserve time slot');
    }

    try {
      // 3. Create the booking within a transaction
      const booking = await this.withTransaction(async () => {
        // Get or create customer
        const customerId = await bookingCoreService.getOrCreateCustomer({
          email: validated.customerEmail,
          name: validated.customerName,
          phone: validated.customerPhone,
        });

        // Generate booking number
        const bookingNumber = await bookingCoreService.generateBookingNumber();

        // Create booking
        const balanceDue = validated.totalPrice - validated.depositPaid;
        const bookingResult = await this.insert<Booking>('bookings', {
          booking_number: bookingNumber,
          customer_id: customerId,
          customer_name: validated.customerName,
          customer_email: validated.customerEmail,
          customer_phone: validated.customerPhone,
          party_size: validated.partySize,
          tour_date: validated.tourDate,
          start_time: validated.startTime,
          end_time: endTime,
          duration_hours: validated.durationHours,
          total_price: validated.totalPrice,
          deposit_amount: validated.depositPaid,
          deposit_paid: validated.depositPaid > 0,
          final_payment_amount: balanceDue,
          final_payment_paid: false,
          base_price: validated.totalPrice,
          gratuity: 0,
          taxes: 0,
          status: 'pending',
          brand_id: validated.brandId || null,
          vehicle_id: vehicleId,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return bookingResult;
      });

      // 4. Convert hold to booking block
      await vehicleAvailabilityService.convertHoldToBooking(holdBlock.id, booking.id);

      this.log('Booking created with vehicle availability', {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        vehicleId,
      });

      return { ...booking, vehicle_id: vehicleId };

    } catch (error) {
      // 5. Release the hold if booking creation fails
      this.log('Booking creation failed, releasing hold', { holdBlockId: holdBlock.id });
      await vehicleAvailabilityService.releaseHoldBlock(holdBlock.id);
      throw error;
    }
  }

  /**
   * Cancel booking with vehicle availability release
   */
  async cancelWithVehicleRelease(id: number, reason?: string): Promise<Booking> {
    this.log(`Cancelling booking ${id} with vehicle release`, { reason });

    // Use core service for the actual cancellation
    const booking = await bookingCoreService.cancelBooking(id, reason);

    // Delete associated availability blocks (frees up the vehicle)
    await vehicleAvailabilityService.deleteBookingBlocks(id);

    this.log(`Booking ${id} cancelled, vehicle availability released`);

    return booking;
  }
}

// Export singleton instance
export const bookingAvailabilityService = new BookingAvailabilityService();
