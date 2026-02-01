/**
 * TimeCard Service
 * 
 * Business logic for driver time tracking
 */

import { BaseService } from './base.service';
import { ConflictError, BadRequestError } from '@/lib/api/middleware/error-handler';

export interface TimeCard {
  id: number;
  driver_id: number;
  vehicle_id?: number;
  clock_in_time: Date;
  clock_out_time?: Date;
  work_reporting_location?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClockInData {
  driver_id: number;
  vehicle_id?: number;
  work_reporting_location?: string;
}

export class TimeCardService extends BaseService {
  protected get serviceName(): string {
    return 'TimeCardService';
  }

  /**
   * Clock in driver
   */
  async clockIn(data: ClockInData): Promise<TimeCard> {
    this.log('Clocking in driver', { driverId: data.driver_id });

    // Check if driver already has an active time card
    const activeTimeCard = await this.queryOne(
      `SELECT id FROM time_cards 
       WHERE driver_id = $1 AND clock_out_time IS NULL
       LIMIT 1`,
      [data.driver_id]
    );

    if (activeTimeCard) {
      throw new ConflictError('Driver is already clocked in');
    }

    // Verify vehicle is available if provided
    if (data.vehicle_id) {
      const vehicleInUse = await this.queryOne(
        `SELECT id FROM time_cards 
         WHERE vehicle_id = $1 AND clock_out_time IS NULL
         LIMIT 1`,
        [data.vehicle_id]
      );

      if (vehicleInUse) {
        throw new ConflictError('Vehicle is currently assigned to another driver');
      }
    }

    // Create time card
    const timeCard = await this.insert<TimeCard>('time_cards', {
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id || null,
      clock_in_time: new Date(),
      work_reporting_location: data.work_reporting_location || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    this.log(`Driver ${data.driver_id} clocked in successfully`, { timeCardId: timeCard.id });

    return timeCard;
  }

  /**
   * Clock out driver
   */
  async clockOut(driverId: number): Promise<TimeCard> {
    this.log('Clocking out driver', { driverId });

    // Get active time card
    const activeTimeCard = await this.queryOne<TimeCard>(
      `SELECT * FROM time_cards 
       WHERE driver_id = $1 AND clock_out_time IS NULL
       ORDER BY clock_in_time DESC
       LIMIT 1`,
      [driverId]
    );

    if (!activeTimeCard) {
      throw new BadRequestError('No active shift found. Driver must be clocked in to clock out.');
    }

    // Update time card with clock out time
    const updated = await this.update<TimeCard>('time_cards', activeTimeCard.id, {
      clock_out_time: new Date(),
      updated_at: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to clock out driver');
    }

    this.log(`Driver ${driverId} clocked out successfully`, { timeCardId: activeTimeCard.id });

    return updated;
  }

  /**
   * Get active time card for driver
   */
  async getActiveTimeCard(driverId: number): Promise<TimeCard | null> {
    return this.queryOne<TimeCard>(
      `SELECT * FROM time_cards 
       WHERE driver_id = $1 AND clock_out_time IS NULL
       ORDER BY clock_in_time DESC
       LIMIT 1`,
      [driverId]
    );
  }

  /**
   * Get time cards for driver with filters
   */
  async getTimeCards(driverId: number, filters?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) {
    this.log('Getting time cards', { driverId, filters });

    const conditions = ['driver_id = $1'];
    const params: unknown[] = [driverId];
    let paramCount = 1;

    if (filters?.start_date) {
      paramCount++;
      conditions.push(`DATE(clock_in_time) >= $${paramCount}`);
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      paramCount++;
      conditions.push(`DATE(clock_in_time) <= $${paramCount}`);
      params.push(filters.end_date);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      SELECT
        tc.*,
        v.vehicle_number,
        v.make,
        v.model
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE ${whereClause}
      ORDER BY tc.clock_in_time DESC
    `;

    return this.paginate<TimeCard>(
      baseQuery,
      params,
      filters?.limit || 50,
      filters?.offset || 0
    );
  }

  // ==========================================================================
  // Historical Entry Methods
  // ==========================================================================

  /**
   * Create a historical time card entry from paper records
   * Used for digitizing paper time records for compliance history
   */
  async createHistoricalTimeCard(data: {
    driverId: number;
    vehicleId?: number;
    originalDocumentDate: string; // ISO date string from paper form
    clockInTime: string; // ISO datetime string
    clockOutTime: string; // ISO datetime string
    workReportingLocation?: string;
    drivingHours?: number;
    onDutyHours?: number;
    bookingId?: number; // Link to related booking if known
    enteredBy: number; // Admin user ID
    historicalSource: string; // 'paper_form', 'excel_import', etc.
    entryNotes?: string;
  }): Promise<TimeCard> {
    this.log('Creating historical time card entry', {
      driverId: data.driverId,
      originalDate: data.originalDocumentDate,
    });

    // Verify driver exists
    const driver = await this.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [data.driverId, 'driver']
    );

    if (!driver) {
      throw new BadRequestError(`Driver with ID ${data.driverId} not found`);
    }

    // Verify vehicle exists if provided
    if (data.vehicleId) {
      const vehicle = await this.queryOne<{ id: number }>(
        'SELECT id FROM vehicles WHERE id = $1',
        [data.vehicleId]
      );

      if (!vehicle) {
        throw new BadRequestError(`Vehicle with ID ${data.vehicleId} not found`);
      }
    }

    // Check for duplicate entry (same driver, same shift times)
    const existing = await this.queryOne(
      `SELECT id FROM time_cards
       WHERE driver_id = $1
         AND clock_in_time = $2
         AND is_historical_entry = true
       LIMIT 1`,
      [data.driverId, data.clockInTime]
    );

    if (existing) {
      throw new ConflictError(
        `Historical time card already exists for this driver/shift combination`
      );
    }

    // Calculate hours if not provided
    const clockIn = new Date(data.clockInTime);
    const clockOut = new Date(data.clockOutTime);
    const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    // Create the historical time card
    const timeCard = await this.insert<TimeCard>('time_cards', {
      driver_id: data.driverId,
      vehicle_id: data.vehicleId || null,
      date: data.originalDocumentDate,
      clock_in_time: data.clockInTime,
      clock_out_time: data.clockOutTime,
      work_reporting_location: data.workReportingLocation || null,
      driving_hours: data.drivingHours ?? null,
      on_duty_hours: data.onDutyHours ?? totalHours,
      status: 'complete',
      // Historical entry fields
      is_historical_entry: true,
      historical_source: data.historicalSource,
      entered_by: data.enteredBy,
      entry_date: new Date(),
      entry_notes: data.entryNotes || null,
      original_document_date: data.originalDocumentDate,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Link to booking if provided
    if (data.bookingId) {
      await this.query(
        'UPDATE bookings SET time_card_id = $1 WHERE id = $2',
        [timeCard.id, data.bookingId]
      );
    }

    this.log(`Historical time card created: ${timeCard.id}`, {
      originalDate: data.originalDocumentDate,
      source: data.historicalSource,
    });

    return timeCard;
  }

  /**
   * Get historical time cards for review
   */
  async getHistoricalTimeCards(filters?: {
    driverId?: number;
    vehicleId?: number;
    startDate?: string;
    endDate?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }) {
    this.log('Getting historical time cards', { filters });

    const conditions = ['tc.is_historical_entry = true'];
    const params: unknown[] = [];
    let paramCount = 0;

    if (filters?.driverId) {
      paramCount++;
      conditions.push(`tc.driver_id = $${paramCount}`);
      params.push(filters.driverId);
    }

    if (filters?.vehicleId) {
      paramCount++;
      conditions.push(`tc.vehicle_id = $${paramCount}`);
      params.push(filters.vehicleId);
    }

    if (filters?.startDate) {
      paramCount++;
      conditions.push(`tc.original_document_date >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      paramCount++;
      conditions.push(`tc.original_document_date <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters?.source) {
      paramCount++;
      conditions.push(`tc.historical_source = $${paramCount}`);
      params.push(filters.source);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      SELECT
        tc.*,
        d.name as driver_name,
        v.vehicle_number,
        v.make,
        v.model,
        e.name as entered_by_name,
        b.booking_number
      FROM time_cards tc
      LEFT JOIN users d ON tc.driver_id = d.id
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      LEFT JOIN users e ON tc.entered_by = e.id
      LEFT JOIN bookings b ON b.time_card_id = tc.id
      WHERE ${whereClause}
      ORDER BY tc.original_document_date DESC, tc.clock_in_time DESC
    `;

    return this.paginate<TimeCard>(
      baseQuery,
      params,
      filters?.limit || 50,
      filters?.offset || 0
    );
  }

  /**
   * Link a time card to a booking
   */
  async linkToBooking(timeCardId: number, bookingId: number): Promise<boolean> {
    this.log('Linking time card to booking', { timeCardId, bookingId });

    // Verify the booking exists and dates match
    const booking = await this.queryOne<{ id: number; tour_date: string; driver_id: number | null }>(
      'SELECT id, tour_date, driver_id FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (!booking) {
      throw new BadRequestError(`Booking with ID ${bookingId} not found`);
    }

    // Verify the time card exists
    const timeCard = await this.queryOne<{ id: number; driver_id: number; date: string }>(
      'SELECT id, driver_id, DATE(clock_in_time) as date FROM time_cards WHERE id = $1',
      [timeCardId]
    );

    if (!timeCard) {
      throw new BadRequestError(`Time card with ID ${timeCardId} not found`);
    }

    // Update booking with time card reference
    await this.query(
      'UPDATE bookings SET time_card_id = $1, driver_id = $2, updated_at = NOW() WHERE id = $3',
      [timeCardId, timeCard.driver_id, bookingId]
    );

    return true;
  }

  /**
   * Get time card statistics for compliance reporting
   */
  async getTimeCardStats(filters?: {
    driverId?: number;
    startDate?: string;
    endDate?: string;
    includeHistorical?: boolean;
  }): Promise<{
    totalTimeCards: number;
    totalDrivingHours: number;
    totalOnDutyHours: number;
    averageShiftLength: number;
    historicalEntries: number;
    linkedToBookings: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramCount = 0;

    if (filters?.driverId) {
      paramCount++;
      conditions.push(`driver_id = $${paramCount}`);
      params.push(filters.driverId);
    }

    if (filters?.startDate) {
      paramCount++;
      conditions.push(`COALESCE(original_document_date, DATE(clock_in_time)) >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      paramCount++;
      conditions.push(`COALESCE(original_document_date, DATE(clock_in_time)) <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters?.includeHistorical === false) {
      conditions.push('is_historical_entry = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const stats = await this.queryOne<{
      total_time_cards: number;
      total_driving_hours: number;
      total_on_duty_hours: number;
      avg_shift_length: number;
      historical_entries: number;
      linked_to_bookings: number;
    }>(
      `SELECT
        COUNT(*)::int as total_time_cards,
        COALESCE(SUM(driving_hours), 0)::float as total_driving_hours,
        COALESCE(SUM(on_duty_hours), 0)::float as total_on_duty_hours,
        COALESCE(AVG(EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600), 0)::float as avg_shift_length,
        COUNT(*) FILTER (WHERE is_historical_entry = true)::int as historical_entries,
        (SELECT COUNT(*) FROM bookings WHERE time_card_id IN (SELECT id FROM time_cards ${whereClause}))::int as linked_to_bookings
      FROM time_cards
      ${whereClause}`,
      params
    );

    return {
      totalTimeCards: stats?.total_time_cards || 0,
      totalDrivingHours: stats?.total_driving_hours || 0,
      totalOnDutyHours: stats?.total_on_duty_hours || 0,
      averageShiftLength: Math.round((stats?.avg_shift_length || 0) * 10) / 10,
      historicalEntries: stats?.historical_entries || 0,
      linkedToBookings: stats?.linked_to_bookings || 0,
    };
  }
}

// Export singleton instance
export const timeCardService = new TimeCardService();




