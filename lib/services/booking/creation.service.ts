/**
 * Booking Creation Service
 *
 * @module lib/services/booking/creation.service
 * @description Complex booking creation flows with customer, pricing, wineries, and payment
 */

import { BaseService } from '../base.service';
import { customerService } from '../customer.service';
import { pricingService } from '../pricing.service';
import {
  Booking,
  Winery,
  CreateFullBookingData,
} from './types';
import { bookingCoreService } from './core.service';

export class BookingCreationService extends BaseService {
  protected get serviceName(): string {
    return 'BookingCreationService';
  }

  /**
   * Create a complete booking with customer, pricing, wineries, and payment
   */
  async createFullBooking(data: CreateFullBookingData): Promise<{
    booking: Booking & {
      customer_name: string;
      customer_email: string;
      wineries: Winery[];
      balance_due: number;
      confirmation_sent: boolean;
    };
    payment: {
      deposit_amount: number;
      payment_status: string;
      stripe_payment_method_id: string;
    };
    next_steps: string[];
  }> {
    this.log('Creating full booking with payment', {
      customerEmail: data.customer.email,
      tourDate: data.booking.tour_date,
    });

    return this.withTransaction(async () => {
      // 1. Find or create customer
      const customer = await customerService.findOrCreate({
        ...data.customer,
        email_marketing_consent: data.marketing_consent?.email,
        sms_marketing_consent: data.marketing_consent?.sms,
      });

      // 2. Calculate pricing
      const pricing = await pricingService.calculatePricing({
        tourDate: data.booking.tour_date,
        partySize: data.booking.party_size,
        durationHours: data.booking.duration_hours,
      });

      // 3. Calculate end time
      const endTime = pricingService.calculateEndTime(
        data.booking.start_time,
        data.booking.duration_hours,
        data.booking.tour_date
      );

      // 4. Generate booking number
      const bookingNumber = await bookingCoreService.generateBookingNumber();

      // 5. Create booking record
      const bookingResult = await this.insert<Booking>('bookings', {
        booking_number: bookingNumber,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || null,
        party_size: data.booking.party_size,
        tour_date: data.booking.tour_date,
        start_time: data.booking.start_time,
        end_time: endTime,
        duration_hours: data.booking.duration_hours,
        pickup_location: data.booking.pickup_location,
        dropoff_location: data.booking.dropoff_location || data.booking.pickup_location,
        special_requests: data.booking.special_requests || null,
        dietary_restrictions: data.booking.dietary_restrictions || null,
        accessibility_needs: data.booking.accessibility_needs || null,
        base_price: pricing.basePrice,
        gratuity: pricing.gratuity,
        taxes: pricing.taxes,
        total_price: pricing.totalPrice,
        deposit_amount: pricing.depositAmount,
        deposit_paid: true,
        deposit_paid_at: new Date(),
        final_payment_amount: pricing.finalPaymentAmount,
        final_payment_paid: false,
        status: 'confirmed',
        booking_source: 'online',
        confirmation_email_sent: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const bookingId = bookingResult.id;

      // 6. Create booking_wineries records
      await this.createWineryAssignments(bookingId, data.wineries);

      // 7. Create payment record
      await this.createPaymentRecord({
        bookingId,
        customerId: customer.id,
        amount: pricing.depositAmount,
        stripePaymentMethodId: data.payment.stripe_payment_method_id,
      });

      // 8. Create booking timeline event
      await this.createTimelineEvent(bookingId, 'booking_created', 'Booking created successfully', {
        booking_number: bookingNumber,
        customer_email: customer.email,
        total_price: pricing.totalPrice,
        deposit_paid: pricing.depositAmount,
      });

      // 9. Update customer statistics
      await customerService.updateStatistics(
        customer.id,
        pricing.totalPrice,
        data.booking.tour_date
      );

      // 10. Fetch winery details for response
      const wineryDetails = await this.getWineryDetailsForBooking(bookingId);

      this.log(`Full booking created: ${bookingNumber} for ${customer.email}`);

      // Return complete booking data
      return {
        booking: {
          ...bookingResult,
          customer_name: customer.name,
          customer_email: customer.email,
          wineries: wineryDetails,
          balance_due: pricing.finalPaymentAmount,
          confirmation_sent: false,
        },
        payment: {
          deposit_amount: pricing.depositAmount,
          payment_status: 'succeeded',
          stripe_payment_method_id: data.payment.stripe_payment_method_id,
        },
        next_steps: [
          'Check your email for booking confirmation and itinerary',
          `Final payment of $${pricing.finalPaymentAmount} due 48 hours after tour concludes`,
          "You'll receive a reminder 72 hours before your tour",
          'Your driver will be assigned before your tour date',
        ],
      };
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Create winery assignments for a booking
   */
  private async createWineryAssignments(bookingId: number, wineries: Winery[]): Promise<void> {
    for (const winery of wineries) {
      await this.query(
        `INSERT INTO booking_wineries (booking_id, winery_id, visit_order, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [bookingId, winery.winery_id, winery.visit_order]
      );
    }
  }

  /**
   * Create payment record for a booking
   */
  private async createPaymentRecord(params: {
    bookingId: number;
    customerId: number;
    amount: number;
    stripePaymentMethodId: string;
  }): Promise<void> {
    await this.query(
      `INSERT INTO payments (
        booking_id, customer_id, amount, currency, payment_type,
        payment_method, stripe_payment_intent_id, status,
        created_at, updated_at, succeeded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        params.bookingId,
        params.customerId,
        params.amount,
        'USD',
        'deposit',
        'card',
        params.stripePaymentMethodId,
        'succeeded',
      ]
    );
  }

  /**
   * Create a timeline event for booking history
   */
  private async createTimelineEvent(
    bookingId: number,
    eventType: string,
    description: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.query(
      `INSERT INTO booking_timeline (booking_id, event_type, event_description, event_data, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [bookingId, eventType, description, JSON.stringify(data)]
    );
  }

  /**
   * Get winery details for a booking response
   */
  private async getWineryDetailsForBooking(bookingId: number): Promise<Winery[]> {
    const result = await this.query<{
      id: number;
      name: string;
      slug: string;
      visit_order: number;
    }>(
      `SELECT w.id, w.name, w.slug, bw.visit_order
       FROM booking_wineries bw
       JOIN wineries w ON w.id = bw.winery_id
       WHERE bw.booking_id = $1
       ORDER BY bw.visit_order`,
      [bookingId]
    );

    return result.rows.map((w) => ({
      winery_id: w.id,
      name: w.name,
      slug: w.slug,
      visit_order: w.visit_order,
    }));
  }
}

// Export singleton instance
export const bookingCreationService = new BookingCreationService();
