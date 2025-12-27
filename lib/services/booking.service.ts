/**
 * Booking Service
 * 
 * Consolidated business logic for booking operations.
 * Uses BaseService from base.service.ts for database operations.
 * 
 * Merged from booking.service.ts and booking-service.ts
 */

import { BaseService } from './base.service';
import { customerService, CreateCustomerData } from './customer.service';
import { pricingService } from './pricing.service';
import { vehicleAvailabilityService } from './vehicle-availability.service';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
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
  driver_id?: number;
  vehicle_id?: number;
  brand_id?: number;
  created_at: string;
  updated_at: string;
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

export interface CreateBookingData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  tourDate: string;
  startTime: string;
  durationHours: number;
  totalPrice: number;
  depositPaid: number;
  brandId?: number;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateBookingSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  partySize: z.number().int().min(1).max(50),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(4).max(24),
  totalPrice: z.number().min(0),
  depositPaid: z.number().min(0),
  brandId: z.number().int().positive().optional(),
});

// ============================================================================
// Booking Service
// ============================================================================

export class BookingService extends BaseService {
  protected get serviceName(): string {
    return 'BookingService';
  }

  // ==========================================================================
  // Read Operations
  // ==========================================================================

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
   * Get booking by booking number
   */
  async getByNumber(bookingNumber: string): Promise<Booking> {
    this.log(`Fetching booking by number: ${bookingNumber}`);

    const result = await this.query<Booking>(
      'SELECT * FROM bookings WHERE booking_number = $1',
      [bookingNumber]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Booking', bookingNumber);
    }

    return result.rows[0];
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
   * Get all bookings for a customer
   */
  async getCustomerBookings(customerId: number): Promise<Booking[]> {
    this.log(`Fetching customer bookings: ${customerId}`);

    return await this.findWhere<Booking>(
      'bookings',
      'customer_id = $1',
      [customerId],
      '*',
      'created_at DESC'
    );
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(limit: number = 10): Promise<Booking[]> {
    this.log(`Fetching upcoming bookings, limit: ${limit}`);

    const result = await this.query<Booking>(
      `SELECT * FROM bookings 
       WHERE tour_date >= CURRENT_DATE 
       AND status IN ('pending', 'confirmed')
       ORDER BY tour_date ASC, start_time ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
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
   * Get bookings with filters and pagination - optimized with JSON aggregation
   */
  async findManyWithFilters(filters: {
    year?: string;
    month?: string;
    status?: string;
    customerId?: number;
    brandId?: number;
    includeWineries?: boolean;
    includeDriver?: boolean;
    includeVehicle?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: Booking[]; total: number }> {
    this.log('Finding bookings with filters', filters);

    const whereClause: string[] = [];
    const params: any[] = [];

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

  // ==========================================================================
  // Create Operations
  // ==========================================================================

  /**
   * Create a simple booking (used by v1 API)
   */
  async createBooking(data: CreateBookingData): Promise<Booking> {
    this.log('Creating booking', {
      customerEmail: data.customerEmail,
      tourDate: data.tourDate,
    });

    return this.withTransaction(async () => {
      // 1. Validate data
      const validated = CreateBookingSchema.parse(data);

      // 2. Check availability
      await this.checkAvailability(validated.tourDate, validated.partySize);

      // 3. Get or create customer
      const customerId = await this.getOrCreateCustomer({
        email: validated.customerEmail,
        name: validated.customerName,
        phone: validated.customerPhone,
      });

      // 4. Generate booking number
      const bookingNumber = await this.generateBookingNumber();

      // 5. Create booking
      const balanceDue = validated.totalPrice - validated.depositPaid;
      const booking = await this.insert<Booking>('bookings', {
        booking_number: bookingNumber,
        customer_id: customerId,
        customer_name: validated.customerName,
        customer_email: validated.customerEmail,
        customer_phone: validated.customerPhone,
        party_size: validated.partySize,
        tour_date: validated.tourDate,
        start_time: validated.startTime,
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
        created_at: new Date(),
        updated_at: new Date(),
      });

      this.log('Booking created successfully', {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        customerId,
      });

      return booking;
    });
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
   * Create a booking with transactional vehicle availability
   * Uses the new vehicle_availability_blocks table with exclusion constraint
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
    const endTime = data.endTime || this.calculateEndTime(validated.startTime, validated.durationHours);

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
        const customerId = await this.getOrCreateCustomer({
          email: validated.customerEmail,
          name: validated.customerName,
          phone: validated.customerPhone,
        });

        // Generate booking number
        const bookingNumber = await this.generateBookingNumber();

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
   * Check availability using the new vehicle availability service
   */
  async checkBookingAvailability(params: {
    date: string;
    startTime: string;
    durationHours: number;
    partySize: number;
    brandId?: number;
  }): Promise<{
    available: boolean;
    vehicleId: number | null;
    vehicleName: string | null;
    conflicts: string[];
    availableSlots: Array<{
      start: string;
      end: string;
      available: boolean;
      vehicle_id?: number;
      vehicle_name?: string;
    }>;
  }> {
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
   * Calculate end time from start time and duration
   */
  private calculateEndTime(startTime: string, durationHours: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  // ==========================================================================
  // Update Operations
  // ==========================================================================

  /**
   * Update booking by ID
   */
  async updateById(id: number, data: Partial<Booking>): Promise<Booking> {
    this.log(`Updating booking ${id}`, data);

    // Check if booking exists
    const existsResult = await this.exists('bookings', 'id = $1', [id]);
    if (!existsResult) {
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
   * Update booking status with validation
   */
  async updateStatus(id: number, status: Booking['status']): Promise<Booking> {
    this.log(`Updating booking status: ${id} -> ${status}`);

    // Get current booking
    const booking = await this.getById(id);
    if (!booking) {
      throw new NotFoundError('Booking', id.toString());
    }

    // Validate status transition
    this.validateStatusTransition(booking.status, status);

    const updated = await this.update<Booking>('bookings', id, { 
      status,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new NotFoundError('Booking', id.toString());
    }

    this.log(`Booking status updated: ${id} from ${booking.status} to ${status}`);

    return updated;
  }

  /**
   * Confirm booking
   */
  async confirmBooking(id: number): Promise<Booking> {
    return await this.updateStatus(id, 'confirmed');
  }

  /**
   * Update booking (partial update) - alias for updateById for backwards compatibility
   */
  async updateBooking(id: number, data: Partial<Booking>): Promise<Booking> {
    return this.updateById(id, data);
  }

  /**
   * Cancel booking - alias for cancel() for backwards compatibility
   */
  async cancelBooking(id: number, reason?: string): Promise<Booking> {
    return this.cancel(id, reason);
  }

  /**
   * Cancel booking with business logic
   * Also releases the vehicle availability blocks
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

      // Delete associated availability blocks (frees up the vehicle)
      await vehicleAvailabilityService.deleteBookingBlocks(id);

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

      this.log(`Booking ${id} cancelled successfully, vehicle availability released`);

      return updated;
    });
  }

  // ==========================================================================
  // Business Logic
  // ==========================================================================

  /**
   * Calculate total price for booking
   */
  calculateTotalPrice(partySize: number, durationHours: number, date: string): number {
    const baseRate = 100; // per hour
    const perPersonRate = 50;
    
    // Weekend multiplier
    const isWeekend = [0, 5, 6].includes(new Date(date).getDay());
    const weekendMultiplier = isWeekend ? 1.2 : 1.0;

    const total = (
      (baseRate * durationHours) +
      (perPersonRate * partySize)
    ) * weekendMultiplier;

    return Math.round(total * 100) / 100;
  }

  /**
   * Get booking statistics
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<{
    totalBookings: number;
    totalRevenue: number;
    averagePartySize: number;
    cancelledRate: number;
  }> {
    const whereClause = [];
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      whereClause.push(`tour_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      whereClause.push(`tour_date <= $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const result = await this.query<{
      total_bookings: string;
      total_revenue: string;
      avg_party_size: string;
      cancelled_count: string;
    }>(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(total_price) as total_revenue,
        AVG(party_size) as avg_party_size,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
       FROM bookings
       ${where}`,
      params
    );

    const row = result.rows[0];
    const totalBookings = parseInt(row.total_bookings, 10);

    return {
      totalBookings,
      totalRevenue: parseFloat(row.total_revenue || '0'),
      averagePartySize: parseFloat(row.avg_party_size || '0'),
      cancelledRate: totalBookings > 0 
        ? parseInt(row.cancelled_count, 10) / totalBookings 
        : 0,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Check if date/time is available
   */
  private async checkAvailability(date: string, partySize: number): Promise<void> {
    // Check if date is in the past
    if (new Date(date) < new Date()) {
      throw new ValidationError('Cannot book tours in the past');
    }

    // Check max capacity for date
    const result = await this.query<{ total_party_size: string }>(
      `SELECT SUM(party_size) as total_party_size
       FROM bookings
       WHERE tour_date = $1
       AND status IN ('pending', 'confirmed')`,
      [date]
    );

    const currentCapacity = parseInt(result.rows[0]?.total_party_size || '0', 10);
    const maxCapacity = 50; // Example: max 50 guests per day

    if (currentCapacity + partySize > maxCapacity) {
      throw new ConflictError(
        'Not enough capacity available for this date'
      );
    }
  }

  /**
   * Get or create customer
   */
  private async getOrCreateCustomer(data: {
    email: string;
    name: string;
    phone: string;
  }): Promise<number> {
    // Check if customer exists
    const existing = await this.query<{ id: number }>(
      'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
      [data.email]
    );

    if (existing.rows.length > 0) {
      // Update customer info
      await this.query(
        'UPDATE customers SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
        [data.name, data.phone, existing.rows[0].id]
      );
      return existing.rows[0].id;
    }

    // Create new customer
    const newCustomer = await this.insert<{ id: number }>('customers', {
      email: data.email,
      name: data.name,
      phone: data.phone,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return newCustomer.id;
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

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: Booking['status'],
    newStatus: Booking['status']
  ): void {
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService();
