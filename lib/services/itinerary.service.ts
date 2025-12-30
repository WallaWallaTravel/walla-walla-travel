import { logger } from '@/lib/logger';
/**
 * Itinerary Service
 * Handles all itinerary and itinerary stop business logic
 */

import { BaseService } from './base.service';
import { NotFoundError, ConflictError } from '@/lib/api/middleware/error-handler';

interface Itinerary {
  id: number;
  booking_id: number;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  estimated_dropoff_time: string;
  driver_notes?: string;
  internal_notes?: string;
  stops?: any[];
}

interface CreateItineraryData {
  booking_id: number;
  pickup_location?: string;
  pickup_time?: string;
  dropoff_location?: string;
  estimated_dropoff_time?: string;
  driver_notes?: string;
  internal_notes?: string;
}

interface UpdateItineraryData {
  pickup_location?: string;
  pickup_time?: string;
  pickup_drive_time_minutes?: number;
  dropoff_location?: string;
  estimated_dropoff_time?: string;
  dropoff_drive_time_minutes?: number;
  internal_notes?: string;
  driver_notes?: string;
}

export class ItineraryService extends BaseService {
  protected get serviceName(): string {
    return 'ItineraryService';
  }

  /**
   * Get itinerary by booking ID (with stops and wineries)
   */
  async getByBookingId(bookingId: number): Promise<Itinerary> {
    this.log('Getting itinerary', { bookingId });

    const result = await this.query(`
      SELECT
        i.*,
        json_agg(
          json_build_object(
            'id', s.id,
            'winery_id', s.winery_id,
            'stop_order', s.stop_order,
            'arrival_time', s.arrival_time,
            'departure_time', s.departure_time,
            'duration_minutes', s.duration_minutes,
            'drive_time_to_next_minutes', s.drive_time_to_next_minutes,
            'stop_type', s.stop_type,
            'reservation_confirmed', s.reservation_confirmed,
            'special_notes', s.special_notes,
            'is_lunch_stop', s.is_lunch_stop,
            'winery', json_build_object(
              'id', w.id,
              'name', w.name,
              'slug', w.slug,
              'address', w.address,
              'city', w.city,
              'tasting_fee', w.tasting_fee,
              'average_visit_duration', w.average_visit_duration
            )
          ) ORDER BY s.stop_order
        ) FILTER (WHERE s.id IS NOT NULL) as stops
      FROM itineraries i
      LEFT JOIN itinerary_stops s ON i.id = s.itinerary_id
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE i.booking_id = $1
      GROUP BY i.id
    `, [bookingId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Itinerary not found for this booking');
    }

    return result.rows[0];
  }

  /**
   * Create new itinerary
   */
  async create(data: CreateItineraryData): Promise<Itinerary> {
    this.log('Creating itinerary', { bookingId: data.booking_id });

    // Check if itinerary already exists
    const existing = await this.query(
      'SELECT id FROM itineraries WHERE booking_id = $1',
      [data.booking_id]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('Itinerary already exists for this booking');
    }

    // Create new itinerary
    const result = await this.query(`
      INSERT INTO itineraries (
        booking_id,
        pickup_location,
        pickup_time,
        dropoff_location,
        estimated_dropoff_time,
        driver_notes,
        internal_notes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      data.booking_id,
      data.pickup_location || 'TBD',
      data.pickup_time || '10:00',
      data.dropoff_location || 'TBD',
      data.estimated_dropoff_time || '16:00',
      data.driver_notes || '',
      data.internal_notes || ''
    ]);

    return result.rows[0];
  }

  /**
   * Update itinerary by booking ID
   */
  async updateByBookingId(bookingId: number, data: UpdateItineraryData): Promise<Itinerary> {
    this.log('Updating itinerary', { bookingId });

    // First get the itinerary ID for this booking
    const itineraryResult = await this.query(
      'SELECT id FROM itineraries WHERE booking_id = $1',
      [bookingId]
    );

    if (itineraryResult.rows.length === 0) {
      throw new NotFoundError('Itinerary not found');
    }

    const itineraryId = itineraryResult.rows[0].id;

    const result = await this.query(`
      UPDATE itineraries
      SET
        pickup_location = COALESCE($1, pickup_location),
        pickup_time = COALESCE($2, pickup_time),
        pickup_drive_time_minutes = COALESCE($3, pickup_drive_time_minutes),
        dropoff_location = COALESCE($4, dropoff_location),
        estimated_dropoff_time = COALESCE($5, estimated_dropoff_time),
        dropoff_drive_time_minutes = COALESCE($6, dropoff_drive_time_minutes),
        internal_notes = COALESCE($7, internal_notes),
        driver_notes = COALESCE($8, driver_notes),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      data.pickup_location,
      data.pickup_time,
      data.pickup_drive_time_minutes,
      data.dropoff_location,
      data.estimated_dropoff_time,
      data.dropoff_drive_time_minutes,
      data.internal_notes,
      data.driver_notes,
      itineraryId
    ]);

    return result.rows[0];
  }

  /**
   * Delete itinerary by booking ID
   */
  async deleteByBookingId(bookingId: number): Promise<void> {
    this.log('Deleting itinerary', { bookingId });

    await this.query('DELETE FROM itineraries WHERE booking_id = $1', [bookingId]);
  }
}

export const itineraryService = new ItineraryService();




