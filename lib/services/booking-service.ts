/**
 * Booking Service
 * Handles all booking-related business logic
 * Example of proper service layer implementation
 */

import { BaseService, NotFoundError, ConflictError, ValidationError } from './base-service';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  total_price: number;
  deposit_paid: number;
  balance_due: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  brand_id?: number;
  created_at: string;
  updated_at: string;
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

// Validation schema
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
  constructor() {
    super('BookingService');
  }

  // ==========================================================================
  // Create Operations
  // ==========================================================================

  /**
   * Create a new booking
   */
  async createBooking(data: CreateBookingData): Promise<Booking> {
    this.logInfo('Creating booking', {
      customerEmail: data.customerEmail,
      tourDate: data.tourDate,
    });

    return await this.transaction(async () => {
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
      const booking = await this.create<Booking>('bookings', {
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
        deposit_paid: validated.depositPaid,
        balance_due: balanceDue,
        final_payment_amount: balanceDue, // Remaining balance to be paid
        status: 'pending',
        brand_id: validated.brandId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 6. Log business event
      this.logInfo('Booking created successfully', {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        customerId,
      });

      return booking;
    });
  }

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * Get booking by ID
   */
  async getBookingById(id: number): Promise<Booking> {
    this.logInfo('Fetching booking', { id });

    const booking = await this.findById<Booking>('bookings', id);

    if (!booking) {
      throw new NotFoundError('Booking', id.toString());
    }

    return booking;
  }

  /**
   * Get booking by booking number
   */
  async getBookingByNumber(bookingNumber: string): Promise<Booking> {
    this.logInfo('Fetching booking by number', { bookingNumber });

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
   * Get all bookings for a customer
   */
  async getCustomerBookings(customerId: number): Promise<Booking[]> {
    this.logInfo('Fetching customer bookings', { customerId });

    return await this.findMany<Booking>(
      'bookings',
      { customer_id: customerId },
      { orderBy: 'created_at DESC' }
    );
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(limit: number = 10): Promise<Booking[]> {
    this.logInfo('Fetching upcoming bookings', { limit });

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

  // ==========================================================================
  // Update Operations
  // ==========================================================================

  /**
   * Update booking status
   */
  async updateStatus(
    id: number,
    status: Booking['status']
  ): Promise<Booking> {
    this.logInfo('Updating booking status', { id, status });

    // Validate status transition
    const booking = await this.getBookingById(id);
    this.validateStatusTransition(booking.status, status);

    const updated = await this.update<Booking>('bookings', id, { status });

    if (!updated) {
      throw new NotFoundError('Booking', id.toString());
    }

    this.logInfo('Booking status updated', {
      id,
      oldStatus: booking.status,
      newStatus: status,
    });

    return updated;
  }

  /**
   * Confirm booking
   */
  async confirmBooking(id: number): Promise<Booking> {
    return await this.updateStatus(id, 'confirmed');
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id: number, reason?: string): Promise<Booking> {
    this.logInfo('Cancelling booking', { id, reason });

    const booking = await this.updateStatus(id, 'cancelled');

    // Log cancellation reason if provided
    if (reason) {
      await this.query(
        `INSERT INTO booking_activity_log (booking_id, activity_type, notes, created_at)
         VALUES ($1, 'cancellation', $2, NOW())`,
        [id, reason]
      );
    }

    return booking;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Check if date/time is available
   */
  private async checkAvailability(
    date: string,
    partySize: number
  ): Promise<void> {
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
        'Not enough capacity available for this date',
        { currentCapacity, requestedSize: partySize, maxCapacity }
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
    const newCustomer = await this.create<{ id: number }>('customers', {
      email: data.email,
      name: data.name,
      phone: data.phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return newCustomer.id;
  }

  /**
   * Generate unique booking number
   */
  private async generateBookingNumber(): Promise<string> {
    const prefix = 'WWT';
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `${prefix}-${year}-${timestamp}${random}`;
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

  // ==========================================================================
  // Business Logic
  // ==========================================================================

  /**
   * Calculate total price for booking
   */
  calculateTotalPrice(
    partySize: number,
    durationHours: number,
    date: string
  ): number {
    // Example pricing logic
    const baseRate = 100; // per hour
    const perPersonRate = 50;
    
    // Weekend multiplier
    const isWeekend = [0, 5, 6].includes(new Date(date).getDay());
    const weekendMultiplier = isWeekend ? 1.2 : 1.0;

    const total = (
      (baseRate * durationHours) +
      (perPersonRate * partySize)
    ) * weekendMultiplier;

    return Math.round(total * 100) / 100; // Round to 2 decimals
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
  // Enhanced Query Methods with Relations
  // ==========================================================================

  /**
   * Get bookings with filters and pagination
   * Optimized to avoid N+1 queries using JSON aggregation
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
    this.logInfo('Finding bookings with filters', { filters });

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
              'arrival_time', bw.arrival_time,
              'departure_time', bw.departure_time
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
          'type', v.type
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
    
    const groupBy = filters.includeWineries ? 'GROUP BY b.id' : '';
    
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
    this.logInfo('Fetching full booking details', { id });

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
              'arrival_time', bw.arrival_time,
              'departure_time', bw.departure_time,
              'stop_order', bw.stop_order
            )
            ORDER BY bw.stop_order
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
          'type', v.type,
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

  /**
   * Update booking (partial update)
   */
  async updateBooking(
    id: number,
    data: Partial<Booking>
  ): Promise<Booking> {
    this.logInfo('Updating booking', { id, fields: Object.keys(data) });

    await this.requireExists('bookings', id, 'Booking');

    const updated = await this.update<Booking>('bookings', id, data);

    if (!updated) {
      throw new NotFoundError('Booking', id.toString());
    }

    this.logInfo('Booking updated successfully', { id });

    return updated;
  }
}

// Export singleton instance
export const bookingService = new BookingService();

