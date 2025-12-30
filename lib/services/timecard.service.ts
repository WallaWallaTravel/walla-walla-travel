import { logger } from '@/lib/logger';
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
    const params: any[] = [driverId];
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
}

// Export singleton instance
export const timeCardService = new TimeCardService();




