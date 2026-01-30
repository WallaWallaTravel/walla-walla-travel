/**
 * Booking Core Service
 *
 * @module lib/services/booking/core.service
 * @description Core CRUD operations, status management, and helper functions
 */

import { BaseService } from '../base.service';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/api/middleware/error-handler';
import { crmSyncService } from '../crm-sync.service';
import { crmTaskAutomationService } from '../crm-task-automation.service';
import {
  Booking,
  BookingStatus,
  CreateBookingData,
  BookingListFilters,
  CreateBookingSchema,
  VALID_STATUS_TRANSITIONS,
} from './types';

export class BookingCoreService extends BaseService {
  protected get serviceName(): string {
    return 'BookingCoreService';
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
  async list(filters: BookingListFilters) {
    this.log('Listing bookings', { ...filters });

    const conditions: string[] = [];
    const params: unknown[] = [];
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

  // ==========================================================================
  // Create Operations (Simple)
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
      await this.checkDateAvailability(validated.tourDate, validated.partySize);

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
  async updateStatus(id: number, status: BookingStatus): Promise<Booking> {
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

    // Sync status change to CRM (async, don't block)
    this.syncStatusChangeToCrm(id, status, booking).catch(err => {
      this.log('CRM status sync failed (non-blocking)', { error: err, bookingId: id });
    });

    return updated;
  }

  /**
   * Sync booking status change to CRM
   */
  private async syncStatusChangeToCrm(
    bookingId: number,
    newStatus: BookingStatus,
    booking: Booking
  ): Promise<void> {
    try {
      // Update CRM deal stage based on booking status
      await crmSyncService.onBookingStatusChange(bookingId, newStatus);

      // If tour completed, create post-tour follow-up task
      if (newStatus === 'completed') {
        const contact = await crmSyncService.getOrCreateContactForCustomer(booking.customer_id);
        if (contact) {
          await crmTaskAutomationService.onTourCompleted({
            contactId: contact.id,
            bookingNumber: booking.booking_number,
            customerName: booking.customer_name || contact.name,
          });
        }
      }
    } catch (error) {
      this.log('CRM status sync error', { error, bookingId, newStatus });
    }
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
   * Cancel booking - simple version without vehicle release
   * For full cancellation with vehicle release, use BookingAvailabilityService.cancel()
   */
  async cancelBooking(id: number, reason?: string): Promise<Booking> {
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

    const updated = await this.updateById(id, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date(),
    } as Partial<Booking>);

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

    // Sync cancellation to CRM (async, don't block)
    crmSyncService.onBookingStatusChange(id, 'cancelled').catch(err => {
      this.log('CRM cancellation sync failed (non-blocking)', { error: err, bookingId: id });
    });

    this.log(`Booking ${id} cancelled successfully`);

    return updated;
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
    const whereClause: string[] = [];
    const params: unknown[] = [];

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
  // Helper Methods (Public for use by other booking services)
  // ==========================================================================

  /**
   * Calculate end time from start time and duration
   */
  calculateEndTime(startTime: string, durationHours: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  /**
   * Generate unique booking number using sequence
   * Format: WWT-YYYY-NNNNN
   */
  async generateBookingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `booking_number_seq_${year}`;

    // Create sequence for this year if it doesn't exist
    await this.query(`CREATE SEQUENCE IF NOT EXISTS ${sequenceName} START 1`);

    // Get next sequence number
    const result = await this.query<{ seq: string }>(`SELECT nextval('${sequenceName}') as seq`);

    const sequenceNumber = result.rows[0].seq;
    const paddedNumber = sequenceNumber.toString().padStart(5, '0');

    return `WWT-${year}-${paddedNumber}`;
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus
  ): void {
    if (!VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Get or create customer
   */
  async getOrCreateCustomer(data: {
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
   * Check if date/time is available (basic capacity check)
   */
  async checkDateAvailability(date: string, partySize: number): Promise<void> {
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
}

// Export singleton instance
export const bookingCoreService = new BookingCoreService();
