import { logger } from '@/lib/logger';
/**
 * Driver Service
 *
 * @module lib/services/driver.service
 * @description Manages driver operations for the tour company fleet.
 * Handles driver assignments, schedules, tour management, and driver-specific data.
 *
 * @features
 * - Driver schedule and assignment management
 * - Tour assignments and pickup details
 * - Driver notes and special instructions
 * - Integration with workflow/clock-in system
 */

import { BaseService } from './base.service';

export interface DriverTour {
  booking_id: number;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  party_size: number;
  status: string;
  itinerary_id: number;
  pickup_location: string;
  dropoff_location: string;
  driver_notes?: string;
  stops: Array<{
    winery_name: string;
    arrival_time: string;
    departure_time: string;
    duration_minutes: number;
    address: string;
  }>;
}

interface Driver {
  id: number;
  email: string;
  name: string;
  role: string;
  phone?: string;
  created_at: Date;
  last_login?: Date;
}

export class DriverService extends BaseService {
  protected get serviceName(): string {
    return 'DriverService';
  }

  /**
   * List all active drivers
   */
  async listActive(): Promise<Driver[]> {
    this.log('Listing active drivers');

    const result = await this.query<Driver>(
      `SELECT
        id, email, name, role, phone,
        created_at, last_login
      FROM users
      WHERE is_active = true
      AND role IN ('driver', 'admin', 'owner')
      ORDER BY
        CASE
          WHEN role = 'owner' THEN 0
          WHEN role = 'admin' THEN 1
          ELSE 2
        END,
        name`,
      []
    );

    return result.rows;
  }

  /**
   * Get driver's tours for a specific date
   */
  async getToursByDate(driverId: number, date: string): Promise<DriverTour[]> {
    this.log('Getting driver tours', { driverId, date });

    const sql = `
      SELECT
        b.id as booking_id,
        b.customer_name,
        b.tour_date,
        b.start_time as pickup_time,
        b.party_size,
        b.status,
        i.id as itinerary_id,
        i.pickup_location,
        i.dropoff_location,
        i.driver_notes,
        json_agg(
          json_build_object(
            'winery_name', w.name,
            'arrival_time', s.arrival_time,
            'departure_time', s.departure_time,
            'duration_minutes', s.duration_minutes,
            'address', w.address || ''
          ) ORDER BY s.stop_order
        ) FILTER (WHERE s.id IS NOT NULL) as stops
      FROM bookings b
      LEFT JOIN itineraries i ON b.id = i.booking_id
      LEFT JOIN itinerary_stops s ON i.id = s.itinerary_id
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE b.driver_id = $1 AND b.tour_date = $2
      GROUP BY b.id, i.id
      ORDER BY b.start_time ASC
    `;

    return this.queryMany<DriverTour>(sql, [driverId, date]);
  }

  /**
   * Get driver's tours for today
   */
  async getTodayTours(driverId: number): Promise<DriverTour[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getToursByDate(driverId, today);
  }

  /**
   * Get a single tour by booking ID for a driver
   * @param bookingId - The booking ID
   * @param driverId - The driver's ID (for access control)
   */
  async getTourById(bookingId: number, driverId?: number): Promise<DriverTour | null> {
    this.log('Getting tour by ID', { bookingId, driverId });

    let sql = `
      SELECT
        b.id as booking_id,
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.tour_date,
        b.start_time as pickup_time,
        b.party_size,
        b.status,
        b.special_requests,
        COALESCE(i.pickup_location, b.pickup_location) as pickup_location,
        COALESCE(i.dropoff_location, b.dropoff_location) as dropoff_location,
        i.id as itinerary_id,
        i.driver_notes,
        b.vehicle_id,
        json_agg(
          json_build_object(
            'id', s.id,
            'winery_name', w.name,
            'arrival_time', s.arrival_time,
            'departure_time', s.departure_time,
            'duration_minutes', s.duration_minutes,
            'address', COALESCE(w.address, ''),
            'phone', w.phone
          ) ORDER BY s.stop_order
        ) FILTER (WHERE s.id IS NOT NULL) as stops
      FROM bookings b
      LEFT JOIN itineraries i ON b.id = i.booking_id
      LEFT JOIN itinerary_stops s ON i.id = s.itinerary_id
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE b.id = $1
    `;

    const params: (number | undefined)[] = [bookingId];

    // Add driver access check if driverId provided
    if (driverId) {
      sql += ` AND b.driver_id = $2`;
      params.push(driverId);
    }

    sql += ` GROUP BY b.id, i.id`;

    const result = await this.queryOne<any>(sql, params);
    
    if (!result) return null;

    return result;
  }

  /**
   * Get driver's upcoming tours (from today onwards)
   * @param driverId - The driver's ID
   * @param daysAhead - Number of days to look ahead (default: 30, max: 90)
   * @param limit - Maximum number of tours to return (default: 50)
   */
  async getUpcomingTours(
    driverId: number, 
    daysAhead: number = 30,
    limit: number = 50
  ): Promise<DriverTour[]> {
    // Cap the days ahead at 90 to prevent excessive queries
    const cappedDays = Math.min(daysAhead, 90);
    const cappedLimit = Math.min(limit, 100);
    
    this.log('Getting upcoming driver tours', { driverId, daysAhead: cappedDays, limit: cappedLimit });

    const sql = `
      SELECT
        b.id as booking_id,
        b.customer_name,
        b.tour_date,
        b.start_time as pickup_time,
        b.party_size,
        b.status,
        i.id as itinerary_id,
        i.pickup_location,
        i.dropoff_location,
        i.driver_notes,
        json_agg(
          json_build_object(
            'winery_name', w.name,
            'arrival_time', s.arrival_time,
            'departure_time', s.departure_time,
            'duration_minutes', s.duration_minutes,
            'address', w.address || ''
          ) ORDER BY s.stop_order
        ) FILTER (WHERE s.id IS NOT NULL) as stops
      FROM bookings b
      LEFT JOIN itineraries i ON b.id = i.booking_id
      LEFT JOIN itinerary_stops s ON i.id = s.itinerary_id
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE b.driver_id = $1 
        AND b.tour_date >= CURRENT_DATE
        AND b.tour_date <= CURRENT_DATE + INTERVAL '1 day' * $2
        AND b.status NOT IN ('cancelled', 'rejected')
      GROUP BY b.id, i.id
      ORDER BY b.tour_date ASC, b.start_time ASC
      LIMIT $3
    `;

    return this.queryMany<DriverTour>(sql, [driverId, cappedDays, cappedLimit]);
  }
}

// Export singleton instance
export const driverService = new DriverService();

