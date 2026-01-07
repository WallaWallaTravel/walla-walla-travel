/**
 * Booking Queries Service
 *
 * @module lib/services/booking/queries.service
 * @description Complex query operations with joins and aggregations
 */

import { BaseService } from '../base.service';
import {
  Booking,
  FullBookingDetails,
  BookingQueryFilters,
  BookingQueryRow,
  WineryQueryRow,
  PaymentQueryRow,
  TimelineEvent,
} from './types';

export class BookingQueriesService extends BaseService {
  protected get serviceName(): string {
    return 'BookingQueriesService';
  }

  /**
   * Get comprehensive booking details by booking number
   */
  async getFullBookingByNumber(bookingNumber: string): Promise<FullBookingDetails | null> {
    this.log(`Getting full booking details: ${bookingNumber}`);

    // 1. Get booking with customer
    const booking = await this.queryOne<BookingQueryRow>(`
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
    const wineries = await this.queryMany<WineryQueryRow>(`
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
    let driver: { id: number; name: string; email: string; phone: string } | null = null;
    if (booking.driver_id) {
      driver = await this.queryOne<{ id: number; name: string; email: string; phone: string }>(
        'SELECT id, name, email, phone FROM users WHERE id = $1',
        [booking.driver_id]
      );
    }

    // 4. Get vehicle if assigned
    let vehicle: { id: number; name: string; license_plate: string; type: string; capacity: number } | null = null;
    if (booking.vehicle_id) {
      vehicle = await this.queryOne<{ id: number; name: string; license_plate: string; type: string; capacity: number }>(
        'SELECT id, name, license_plate, vehicle_type as type, capacity FROM vehicles WHERE id = $1',
        [booking.vehicle_id]
      );
    }

    // 5. Get payment history
    const payments = await this.queryMany<PaymentQueryRow>(`
      SELECT id, amount, payment_type, payment_method, status,
        stripe_payment_intent_id, card_brand, card_last4,
        created_at, succeeded_at, failed_at, failure_reason
      FROM payments
      WHERE booking_id = $1
      ORDER BY created_at DESC
    `, [booking.id]);

    // 6. Get timeline
    const timeline = await this.queryMany<TimelineEvent>(`
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
      wineries: wineries.map((w) => ({
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
      payments: payments.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        payment_type: p.payment_type,
        payment_method: p.payment_method,
        status: p.status,
        stripe_payment_intent_id: p.stripe_payment_intent_id,
        card_brand: p.card_brand,
        card_last4: p.card_last4,
        created_at: p.created_at,
        succeeded_at: p.succeeded_at,
        failed_at: p.failed_at,
        failure_reason: p.failure_reason,
      })),
      timeline,
      permissions: {
        can_modify: canModify,
        can_cancel: canCancel,
        cancellation_deadline: cancellationDeadline.toISOString(),
      },
      cancellation: booking.status === 'cancelled' && booking.cancelled_at ? {
        cancelled_at: booking.cancelled_at,
        reason: booking.cancellation_reason || '',
      } : null,
      created_at: booking.created_at,
      completed_at: booking.completed_at,
    };
  }

  /**
   * Get bookings with filters and pagination - optimized with JSON aggregation
   */
  async findManyWithFilters(filters: BookingQueryFilters): Promise<{ bookings: Booking[]; total: number }> {
    this.log('Finding bookings with filters', { ...filters });

    const whereClause: string[] = [];
    const params: unknown[] = [];

    // Build WHERE conditions
    if (filters.year && filters.month) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      params.push(startDate, endDate);
      whereClause.push(`b.tour_date >= $${params.length - 1} AND b.tour_date <= $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      whereClause.push(`b.status = $${params.length}`);
    }

    if (filters.customerId) {
      params.push(filters.customerId);
      whereClause.push(`b.customer_id = $${params.length}`);
    }

    if (filters.brandId) {
      params.push(filters.brandId);
      whereClause.push(`b.brand_id = $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Build SELECT with optional relations (avoid N+1!)
    let selectClause = 'b.*';
    let joinClause = '';

    if (filters.includeWineries) {
      selectClause += `,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', w.id,
              'name', w.name,
              'arrival_time', bw.estimated_arrival_time,
              'departure_time', bw.actual_departure_time
            )
          ) FILTER (WHERE w.id IS NOT NULL),
          '[]'::json
        ) as wineries`;
      joinClause += `
        LEFT JOIN booking_wineries bw ON b.id = bw.booking_id
        LEFT JOIN wineries w ON bw.winery_id = w.id`;
    }

    if (filters.includeDriver) {
      selectClause += `,
        JSON_BUILD_OBJECT(
          'id', u.id,
          'name', u.name,
          'email', u.email
        ) as driver`;
      joinClause += `
        LEFT JOIN users u ON b.driver_id = u.id`;
    }

    if (filters.includeVehicle) {
      selectClause += `,
        JSON_BUILD_OBJECT(
          'id', v.id,
          'make', v.make,
          'model', v.model,
          'type', v.vehicle_type
        ) as vehicle`;
      joinClause += `
        LEFT JOIN vehicles v ON b.vehicle_id = v.id`;
    }

    // Count total (for pagination)
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM bookings b ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get bookings with limit/offset
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const groupBy = filters.includeWineries ? 'GROUP BY b.id' +
      (filters.includeDriver ? ', u.id' : '') +
      (filters.includeVehicle ? ', v.id' : '') : '';

    const sql = `
      SELECT ${selectClause}
      FROM bookings b
      ${joinClause}
      ${where}
      ${groupBy}
      ORDER BY b.tour_date DESC, b.start_time ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.query<Booking>(sql, params);

    return {
      bookings: result.rows,
      total,
    };
  }

  /**
   * Get full booking details with all relations (single query)
   */
  async getFullBookingDetails(id: number | string): Promise<Booking | null> {
    this.log(`Fetching full booking details: ${id}`);

    const isNumber = typeof id === 'number' || /^\d+$/.test(id as string);
    const whereClause = isNumber ? 'b.id = $1' : 'b.booking_number = $1';

    const result = await this.query<Booking>(
      `SELECT
        b.*,
        JSON_BUILD_OBJECT(
          'id', c.id,
          'email', c.email,
          'name', c.name,
          'phone', c.phone,
          'vip_status', c.vip_status
        ) as customer,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', w.id,
              'name', w.name,
              'visit_order', bw.visit_order
            )
          ) FILTER (WHERE w.id IS NOT NULL),
          '[]'::json
        ) as wineries,
        JSON_BUILD_OBJECT(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'phone', u.phone
        ) as driver,
        JSON_BUILD_OBJECT(
          'id', v.id,
          'make', v.make,
          'model', v.model,
          'vehicle_type', v.vehicle_type,
          'license_plate', v.license_plate
        ) as vehicle,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', p.id,
              'amount', p.amount,
              'payment_method', p.payment_method,
              'status', p.status,
              'created_at', p.created_at
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as payments
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN booking_wineries bw ON b.id = bw.booking_id
      LEFT JOIN wineries w ON bw.winery_id = w.id
      LEFT JOIN users u ON b.driver_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE ${whereClause}
      GROUP BY b.id, c.id, u.id, v.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

// Export singleton instance
export const bookingQueriesService = new BookingQueriesService();
