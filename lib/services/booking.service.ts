/**
 * Booking Service
 * 
 * Business logic for booking operations
 */

import { BaseService } from './base.service';
import { customerService, CreateCustomerData } from './customer.service';
import { pricingService } from './pricing.service';
import { NotFoundError, ConflictError } from '@/lib/api/middleware/error-handler';

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  status: string;
  total_price: number;
  base_price: number;
  gratuity: number;
  taxes: number;
  deposit_amount: number;
  deposit_paid: boolean;
  final_payment_amount: number;
  final_payment_paid: boolean;
  pickup_location: string;
  dropoff_location: string;
  special_requests?: string;
  dietary_restrictions?: string;
  accessibility_needs?: string;
}

export interface Winery {
  winery_id: number;
  visit_order: number;
  name?: string;
  slug?: string;
}

export interface CreateFullBookingData {
  customer: CreateCustomerData;
  booking: {
    tour_date: string;
    start_time: string;
    duration_hours: number;
    party_size: number;
    pickup_location: string;
    dropoff_location?: string;
    special_requests?: string;
    dietary_restrictions?: string;
    accessibility_needs?: string;
  };
  wineries: Winery[];
  payment: {
    stripe_payment_method_id: string;
  };
  marketing_consent?: {
    email?: boolean;
    sms?: boolean;
  };
}

export class BookingService extends BaseService {
  protected get serviceName(): string {
    return 'BookingService';
  }

  /**
   * Get booking by ID with related data
   */
  async getById(id: number, include?: string[]): Promise<Booking | null> {
    this.log(`Getting booking ${id}`);

    let sql = `
      SELECT 
        b.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'email', c.email,
          'phone', c.phone
        ) as customer
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1
    `;

    // Add optional includes
    if (include?.includes('driver')) {
      sql = sql.replace('b.*', `
        b.*,
        json_build_object(
          'id', d.id,
          'name', d.name
        ) as driver
      `);
      sql = sql.replace('WHERE b.id', 'LEFT JOIN users d ON b.driver_id = d.id WHERE b.id');
    }

    const booking = await this.queryOne<Booking>(sql, [id]);

    if (!booking) {
      throw new NotFoundError(`Booking ${id} not found`);
    }

    return booking;
  }

  /**
   * Get comprehensive booking details by booking number
   */
  async getFullBookingByNumber(bookingNumber: string): Promise<any> {
    this.log(`Getting full booking details: ${bookingNumber}`);

    // 1. Get booking with customer
    const booking = await this.queryOne(`
      SELECT
        b.*,
        c.email as customer_email_verified,
        c.phone as customer_phone_verified,
        c.vip_status
      FROM bookings b
      LEFT JOIN customers c ON c.id = b.customer_id
      WHERE b.booking_number = $1
    `, [bookingNumber]);

    if (!booking) {
      return null;
    }

    // 2. Get wineries with details
    const wineries = await this.queryMany(`
      SELECT
        w.id, w.name, w.slug, w.description, w.short_description,
        w.specialties, w.tasting_fee, w.address, w.city, w.phone,
        w.website, w.photos, w.amenities, w.average_rating,
        bw.visit_order, bw.scheduled_arrival, bw.scheduled_departure,
        bw.actual_arrival, bw.actual_departure, bw.notes
      FROM booking_wineries bw
      JOIN wineries w ON w.id = bw.winery_id
      WHERE bw.booking_id = $1
      ORDER BY bw.visit_order
    `, [booking.id]);

    // 3. Get driver if assigned
    let driver = null;
    if (booking.driver_id) {
      driver = await this.queryOne(
        'SELECT id, name, email, phone FROM users WHERE id = $1',
        [booking.driver_id]
      );
    }

    // 4. Get vehicle if assigned
    let vehicle = null;
    if (booking.vehicle_id) {
      vehicle = await this.queryOne(
        'SELECT id, name, license_plate, vehicle_type as type, capacity FROM vehicles WHERE id = $1',
        [booking.vehicle_id]
      );
    }

    // 5. Get payment history
    const payments = await this.queryMany(`
      SELECT id, amount, payment_type, payment_method, status,
        stripe_payment_intent_id, card_brand, card_last4,
        created_at, succeeded_at, failed_at, failure_reason
      FROM payments
      WHERE booking_id = $1
      ORDER BY created_at DESC
    `, [booking.id]);

    // 6. Get timeline
    const timeline = await this.queryMany(`
      SELECT id, event_type, event_description as description, event_data as data, created_at
      FROM booking_timeline
      WHERE booking_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [booking.id]);

    // 7. Calculate permissions and deadlines
    const tourDate = new Date(booking.tour_date);
    const now = new Date();
    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const cancellationDeadline = new Date(tourDate);
    cancellationDeadline.setHours(cancellationDeadline.getHours() - 72);

    const finalPaymentDueDate = new Date(tourDate);
    finalPaymentDueDate.setHours(finalPaymentDueDate.getHours() - 48);

    const canModify = hoursUntilTour > 72 && !['cancelled', 'completed'].includes(booking.status);
    const canCancel = hoursUntilTour > 24 && !['cancelled', 'completed'].includes(booking.status);

    // Return comprehensive booking data
    return {
      booking_number: booking.booking_number,
      status: booking.status,
      tour_date: booking.tour_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: parseFloat(booking.duration_hours),
      customer: {
        id: booking.customer_id,
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        vip_status: booking.vip_status || false,
      },
      party_size: booking.party_size,
      pickup_location: booking.pickup_location,
      dropoff_location: booking.dropoff_location,
      special_requests: booking.special_requests,
      dietary_restrictions: booking.dietary_restrictions,
      accessibility_needs: booking.accessibility_needs,
      wineries: wineries.map((w: any) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        description: w.short_description || w.description,
        specialties: w.specialties,
        tasting_fee: w.tasting_fee ? parseFloat(w.tasting_fee) : null,
        address: w.address,
        city: w.city,
        phone: w.phone,
        website: w.website,
        photos: w.photos,
        amenities: w.amenities,
        average_rating: w.average_rating ? parseFloat(w.average_rating) : null,
        visit_order: w.visit_order,
        scheduled_arrival: w.scheduled_arrival,
        scheduled_departure: w.scheduled_departure,
        actual_arrival: w.actual_arrival,
        actual_departure: w.actual_departure,
        notes: w.notes,
      })),
      driver,
      vehicle,
      pricing: {
        base_price: parseFloat(booking.base_price),
        gratuity: parseFloat(booking.gratuity),
        taxes: parseFloat(booking.taxes),
        total: parseFloat(booking.total_price),
        deposit_paid: parseFloat(booking.deposit_amount),
        deposit_paid_at: booking.deposit_paid_at,
        balance_due: parseFloat(booking.final_payment_amount),
        balance_due_date: finalPaymentDueDate.toISOString().split('T')[0],
        balance_paid: booking.final_payment_paid,
        balance_paid_at: booking.final_payment_paid_at,
      },
      payments: payments.map((p: any) => ({
        ...p,
        amount: parseFloat(p.amount),
      })),
      timeline,
      permissions: {
        can_modify: canModify,
        can_cancel: canCancel,
        cancellation_deadline: cancellationDeadline.toISOString(),
      },
      cancellation: booking.status === 'cancelled' ? {
        cancelled_at: booking.cancelled_at,
        reason: booking.cancellation_reason,
      } : null,
      created_at: booking.created_at,
      completed_at: booking.completed_at,
    };
  }

  /**
   * List bookings with filters
   */
  async list(filters: {
    year?: string;
    month?: string;
    status?: string;
    customer_id?: number;
    brand_id?: number;
    start_date?: string;
    end_date?: string;
    driver_id?: number;
    limit?: number;
    offset?: number;
  }) {
    this.log('Listing bookings', filters);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (filters.year) {
      paramCount++;
      conditions.push(`EXTRACT(YEAR FROM b.tour_date) = $${paramCount}`);
      params.push(parseInt(filters.year));
    }

    if (filters.month) {
      paramCount++;
      conditions.push(`EXTRACT(MONTH FROM b.tour_date) = $${paramCount}`);
      params.push(parseInt(filters.month));
    }

    if (filters.status) {
      paramCount++;
      conditions.push(`b.status = $${paramCount}`);
      params.push(filters.status);
    }

    if (filters.customer_id) {
      paramCount++;
      conditions.push(`b.customer_id = $${paramCount}`);
      params.push(filters.customer_id);
    }

    if (filters.brand_id) {
      paramCount++;
      conditions.push(`b.brand_id = $${paramCount}`);
      params.push(filters.brand_id);
    }

    if (filters.start_date) {
      paramCount++;
      conditions.push(`b.tour_date >= $${paramCount}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      paramCount++;
      conditions.push(`b.tour_date <= $${paramCount}`);
      params.push(filters.end_date);
    }

    if (filters.driver_id) {
      paramCount++;
      conditions.push(`b.driver_id = $${paramCount}`);
      params.push(filters.driver_id);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const baseQuery = `
      SELECT 
        b.*,
        c.name as customer_name,
        c.email as customer_email,
        d.name as driver_name,
        br.brand_name as brand_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users d ON b.driver_id = d.id
      LEFT JOIN brands br ON b.brand_id = br.id
      ${whereClause}
      ORDER BY b.tour_date DESC, b.start_time DESC
    `;

    return this.paginate(
      baseQuery,
      params,
      filters.limit || 50,
      filters.offset || 0
    );
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
      const bookingNumber = await this.generateBookingNumber();

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
      for (const winery of data.wineries) {
        await this.query(
          `INSERT INTO booking_wineries (booking_id, winery_id, visit_order, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [bookingId, winery.winery_id, winery.visit_order]
        );
      }

      // 7. Create payment record
      await this.query(
        `INSERT INTO payments (
          booking_id, customer_id, amount, currency, payment_type,
          payment_method, stripe_payment_intent_id, status,
          created_at, updated_at, succeeded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          bookingId,
          customer.id,
          pricing.depositAmount,
          'USD',
          'deposit',
          'card',
          data.payment.stripe_payment_method_id,
          'succeeded',
        ]
      );

      // 8. Create booking timeline event
      await this.query(
        `INSERT INTO booking_timeline (booking_id, event_type, event_description, event_data, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          bookingId,
          'booking_created',
          'Booking created successfully',
          JSON.stringify({
            booking_number: bookingNumber,
            customer_email: customer.email,
            total_price: pricing.totalPrice,
            deposit_paid: pricing.depositAmount,
          }),
        ]
      );

      // 9. Update customer statistics
      await customerService.updateStatistics(
        customer.id,
        pricing.totalPrice,
        data.booking.tour_date
      );

      // 10. Fetch winery details for response
      const wineryDetailsResult = await this.query(
        `SELECT w.id, w.name, w.slug, bw.visit_order
         FROM booking_wineries bw
         JOIN wineries w ON w.id = bw.winery_id
         WHERE bw.booking_id = $1
         ORDER BY bw.visit_order`,
        [bookingId]
      );

      const wineryDetails = wineryDetailsResult.rows.map((w: any) => ({
        winery_id: w.id,
        name: w.name,
        slug: w.slug,
        visit_order: w.visit_order,
      }));

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

  /**
   * Update booking
   */
  async updateById(id: number, data: Partial<Booking>): Promise<Booking> {
    this.log(`Updating booking ${id}`, data);

    // Check if booking exists
    const exists = await this.exists('bookings', 'id = $1', [id]);
    if (!exists) {
      throw new NotFoundError(`Booking ${id} not found`);
    }

    const updated = await this.update<Booking>('bookings', id, {
      ...data,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to update booking');
    }

    return updated;
  }

  /**
   * Cancel booking with business logic
   */
  async cancel(id: number, reason?: string): Promise<Booking> {
    this.log(`Cancelling booking ${id}`, { reason });

    const booking = await this.getById(id);

    if (!booking) {
      throw new NotFoundError('Booking', id.toString());
    }

    if (booking.status === 'cancelled') {
      throw new ConflictError('Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      throw new ConflictError('Cannot cancel completed booking');
    }

    // Check cancellation deadline (24 hours before tour)
    const tourDate = new Date(booking.tour_date);
    const now = new Date();
    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilTour < 24) {
      throw new ConflictError('Cancellation deadline has passed. Bookings must be cancelled at least 24 hours before tour date.');
    }

    return this.withTransaction(async () => {
      // Update booking status
      const updated = await this.updateById(id, {
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date(),
      } as any);

      // Log timeline event
      await this.query(
        `INSERT INTO booking_timeline (booking_id, event_type, event_description, event_data, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          id,
          'booking_cancelled',
          'Booking cancelled',
          JSON.stringify({ reason, cancelled_at: new Date() }),
        ]
      );

      this.log(`Booking ${id} cancelled successfully`);

      return updated;
    });
  }

  /**
   * Generate unique booking number using sequence
   * Format: WWT-YYYY-NNNNN
   */
  private async generateBookingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `booking_number_seq_${year}`;

    // Create sequence for this year if it doesn't exist
    await this.query(`CREATE SEQUENCE IF NOT EXISTS ${sequenceName} START 1`);

    // Get next sequence number
    const result = await this.query(`SELECT nextval('${sequenceName}') as seq`);

    const sequenceNumber = result.rows[0].seq;
    const paddedNumber = sequenceNumber.toString().padStart(5, '0');

    return `WWT-${year}-${paddedNumber}`;
  }
}

// Export singleton instance
export const bookingService = new BookingService();

