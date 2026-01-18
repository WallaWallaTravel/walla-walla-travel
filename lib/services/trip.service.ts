/**
 * Trip Service
 *
 * Business logic for trip itinerary management.
 * Handles CRUD operations for trips, stops, and guests.
 */

import { BaseService } from './base.service';
import { nanoid } from 'nanoid';
import type {
  TripBase,
  TripStop,
  TripGuest,
  TripStats,
  Trip,
  TripSummary,
  CreateTripInput,
  TripPreferences,
  AddStopRequest,
  AddGuestRequest,
} from '@/lib/types/trip-planner';

// ============================================================================
// Types
// ============================================================================

interface TripRow {
  id: number;
  share_code: string;
  title: string;
  trip_type: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  dates_flexible: boolean;
  expected_guests: number;
  confirmed_guests: number;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  preferences: TripPreferences;
  is_public: boolean;
  allow_guest_suggestions: boolean;
  allow_guest_rsvp: boolean;
  status: string;
  handoff_requested_at: string | null;
  handoff_notes: string | null;
  assigned_staff_id: number | null;
  converted_to_booking_id: number | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

interface StopRow {
  id: number;
  trip_id: number;
  stop_type: string;
  name: string;
  description: string | null;
  winery_id: number | null;
  day_number: number;
  stop_order: number;
  planned_arrival: string | null;
  planned_departure: string | null;
  duration_minutes: number | null;
  status: string;
  booking_confirmation: string | null;
  notes: string | null;
  special_requests: string | null;
  estimated_cost_per_person: number | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

interface GuestRow {
  id: number;
  trip_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  rsvp_status: string;
  rsvp_responded_at: string | null;
  rsvp_notes: string | null;
  is_organizer: boolean;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  invite_sent_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Service
// ============================================================================

class TripService extends BaseService {
  protected get serviceName(): string {
    return 'TripService';
  }

  // ==========================================================================
  // Trip CRUD
  // ==========================================================================

  /**
   * Create a new trip
   */
  async createTrip(input: CreateTripInput): Promise<Trip> {
    const shareCode = nanoid(10); // 10-char unique code

    const tripData = {
      share_code: shareCode,
      title: input.title,
      trip_type: input.trip_type || 'wine_tour',
      description: input.description || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      dates_flexible: input.dates_flexible ?? true,
      expected_guests: input.expected_guests || 2,
      owner_name: input.owner_name || null,
      owner_email: input.owner_email || null,
      owner_phone: input.owner_phone || null,
      preferences: input.preferences || {
        transportation: 'undecided',
        pace: 'moderate',
        budget: 'moderate',
      },
      status: 'draft',
    };

    const trip = await this.insert<TripRow>('trips', tripData);

    // Log activity
    await this.logActivity(trip.id, 'trip_created', 'Trip created', {
      title: trip.title,
    });

    return this.getTripByShareCode(shareCode) as Promise<Trip>;
  }

  /**
   * Get trip by share code with all related data
   */
  async getTripByShareCode(shareCode: string): Promise<Trip | null> {
    const trip = await this.queryOne<TripRow>(
      'SELECT * FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return null;

    const [stops, guests, stats] = await Promise.all([
      this.getStops(trip.id),
      this.getGuests(trip.id),
      this.getStats(trip.id),
    ]);

    return {
      ...this.mapTripRow(trip),
      stops,
      guests,
      stats,
    };
  }

  /**
   * Get trip by ID
   */
  async getTripById(id: number): Promise<Trip | null> {
    const trip = await this.queryOne<TripRow>(
      'SELECT * FROM trips WHERE id = $1',
      [id]
    );

    if (!trip) return null;

    const [stops, guests, stats] = await Promise.all([
      this.getStops(trip.id),
      this.getGuests(trip.id),
      this.getStats(trip.id),
    ]);

    return {
      ...this.mapTripRow(trip),
      stops,
      guests,
      stats,
    };
  }

  /**
   * Get trips by owner email
   */
  async getTripsByOwnerEmail(email: string): Promise<TripSummary[]> {
    const trips = await this.queryMany<TripRow & { stops_count: string; confirmed_count: string }>(
      `SELECT t.*,
        (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as stops_count,
        (SELECT COUNT(*) FROM trip_guests WHERE trip_id = t.id AND rsvp_status = 'attending') as confirmed_count
      FROM trips t
      WHERE t.owner_email = $1
      ORDER BY t.last_activity_at DESC`,
      [email]
    );

    return trips.map((t) => ({
      id: t.id,
      share_code: t.share_code,
      title: t.title,
      trip_type: t.trip_type as TripSummary['trip_type'],
      start_date: t.start_date || undefined,
      end_date: t.end_date || undefined,
      expected_guests: t.expected_guests,
      status: t.status as TripSummary['status'],
      stops_count: parseInt(t.stops_count, 10),
      confirmed_guests: parseInt(t.confirmed_count, 10),
      last_activity_at: t.last_activity_at,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  /**
   * Update trip fields
   */
  async updateTrip(
    shareCode: string,
    updates: Partial<Omit<CreateTripInput, 'owner_email'>> & { status?: string }
  ): Promise<Trip | null> {
    const trip = await this.queryOne<TripRow>(
      'SELECT id FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return null;

    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.trip_type !== undefined) updateData.trip_type = updates.trip_type;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
    if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
    if (updates.dates_flexible !== undefined) updateData.dates_flexible = updates.dates_flexible;
    if (updates.expected_guests !== undefined) updateData.expected_guests = updates.expected_guests;
    if (updates.owner_name !== undefined) updateData.owner_name = updates.owner_name;
    if (updates.owner_phone !== undefined) updateData.owner_phone = updates.owner_phone;
    if (updates.preferences !== undefined) updateData.preferences = updates.preferences;
    if (updates.status !== undefined) updateData.status = updates.status;

    if (Object.keys(updateData).length > 0) {
      await this.update('trips', trip.id, updateData);

      await this.logActivity(trip.id, 'trip_updated', 'Trip updated', {
        fields: Object.keys(updateData),
      });
    }

    return this.getTripByShareCode(shareCode);
  }

  /**
   * Delete a trip (hard delete)
   */
  async deleteTrip(shareCode: string): Promise<boolean> {
    const trip = await this.queryOne<{ id: number }>(
      'SELECT id FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return false;

    return this.delete('trips', trip.id);
  }

  // ==========================================================================
  // Stops CRUD
  // ==========================================================================

  /**
   * Get stops for a trip
   */
  async getStops(tripId: number): Promise<TripStop[]> {
    const stops = await this.queryMany<StopRow>(
      `SELECT ts.*, w.name as winery_name
       FROM trip_stops ts
       LEFT JOIN wineries w ON ts.winery_id = w.id
       WHERE ts.trip_id = $1
       ORDER BY ts.day_number ASC, ts.stop_order ASC`,
      [tripId]
    );

    return stops.map((s) => this.mapStopRow(s));
  }

  /**
   * Add a stop to a trip
   */
  async addStop(shareCode: string, stop: AddStopRequest): Promise<TripStop | null> {
    const trip = await this.queryOne<{ id: number }>(
      'SELECT id FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return null;

    // Get next stop_order for this day
    const maxOrder = await this.queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(stop_order), -1) as max FROM trip_stops WHERE trip_id = $1 AND day_number = $2',
      [trip.id, stop.day_number]
    );

    const stopData = {
      trip_id: trip.id,
      stop_type: stop.stop_type,
      name: stop.name,
      winery_id: stop.winery_id || null,
      day_number: stop.day_number,
      stop_order: (maxOrder?.max ?? -1) + 1,
      planned_arrival: stop.planned_arrival || null,
      planned_departure: stop.planned_departure || null,
      notes: stop.notes || null,
      status: 'suggested',
    };

    const inserted = await this.insert<StopRow>('trip_stops', stopData);

    await this.logActivity(trip.id, 'stop_added', `Added stop: ${stop.name}`, {
      stop_id: inserted.id,
      stop_type: stop.stop_type,
    });

    return this.mapStopRow(inserted);
  }

  /**
   * Update a stop
   */
  async updateStop(
    stopId: number,
    updates: Partial<AddStopRequest> & { stop_order?: number }
  ): Promise<TripStop | null> {
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.stop_type !== undefined) updateData.stop_type = updates.stop_type;
    if (updates.day_number !== undefined) updateData.day_number = updates.day_number;
    if (updates.stop_order !== undefined) updateData.stop_order = updates.stop_order;
    if (updates.planned_arrival !== undefined) updateData.planned_arrival = updates.planned_arrival;
    if (updates.planned_departure !== undefined) updateData.planned_departure = updates.planned_departure;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.winery_id !== undefined) updateData.winery_id = updates.winery_id;

    if (Object.keys(updateData).length === 0) {
      return this.findById<StopRow>('trip_stops', stopId).then((s) =>
        s ? this.mapStopRow(s) : null
      );
    }

    const updated = await this.update<StopRow>('trip_stops', stopId, updateData);
    return updated ? this.mapStopRow(updated) : null;
  }

  /**
   * Remove a stop
   */
  async removeStop(shareCode: string, stopId: number): Promise<boolean> {
    const stop = await this.queryOne<{ id: number; trip_id: number; name: string }>(
      `SELECT ts.id, ts.trip_id, ts.name
       FROM trip_stops ts
       JOIN trips t ON ts.trip_id = t.id
       WHERE t.share_code = $1 AND ts.id = $2`,
      [shareCode, stopId]
    );

    if (!stop) return false;

    await this.logActivity(stop.trip_id, 'stop_removed', `Removed stop: ${stop.name}`, {
      stop_id: stopId,
    });

    return this.delete('trip_stops', stopId);
  }

  /**
   * Reorder stops within a day
   */
  async reorderStops(
    shareCode: string,
    dayNumber: number,
    stopIds: number[]
  ): Promise<boolean> {
    const trip = await this.queryOne<{ id: number }>(
      'SELECT id FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return false;

    // Update each stop's order
    for (let i = 0; i < stopIds.length; i++) {
      await this.query(
        'UPDATE trip_stops SET stop_order = $1 WHERE id = $2 AND trip_id = $3 AND day_number = $4',
        [i, stopIds[i], trip.id, dayNumber]
      );
    }

    await this.logActivity(trip.id, 'stops_reordered', `Reordered stops for day ${dayNumber}`, {
      day_number: dayNumber,
      new_order: stopIds,
    });

    return true;
  }

  // ==========================================================================
  // Guests CRUD
  // ==========================================================================

  /**
   * Get guests for a trip
   */
  async getGuests(tripId: number): Promise<TripGuest[]> {
    const guests = await this.queryMany<GuestRow>(
      'SELECT * FROM trip_guests WHERE trip_id = $1 ORDER BY is_organizer DESC, created_at ASC',
      [tripId]
    );

    return guests.map((g) => this.mapGuestRow(g));
  }

  /**
   * Add a guest to a trip
   */
  async addGuest(shareCode: string, guest: AddGuestRequest): Promise<TripGuest | null> {
    const trip = await this.queryOne<{ id: number }>(
      'SELECT id FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return null;

    const guestData = {
      trip_id: trip.id,
      name: guest.name,
      email: guest.email || null,
      dietary_restrictions: guest.dietary_restrictions || null,
      rsvp_status: 'pending',
      is_organizer: false,
    };

    const inserted = await this.insert<GuestRow>('trip_guests', guestData);

    await this.logActivity(trip.id, 'guest_added', `Added guest: ${guest.name}`, {
      guest_id: inserted.id,
    });

    return this.mapGuestRow(inserted);
  }

  /**
   * Update guest RSVP status
   */
  async updateGuestRsvp(
    guestId: number,
    status: 'pending' | 'invited' | 'attending' | 'declined' | 'maybe',
    notes?: string
  ): Promise<TripGuest | null> {
    const updateData: Record<string, unknown> = {
      rsvp_status: status,
      rsvp_responded_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.rsvp_notes = notes;
    }

    const updated = await this.update<GuestRow>('trip_guests', guestId, updateData);

    if (updated) {
      // Update confirmed_guests count on trip
      await this.query(
        `UPDATE trips SET confirmed_guests = (
          SELECT COUNT(*) FROM trip_guests WHERE trip_id = $1 AND rsvp_status = 'attending'
        ) WHERE id = $1`,
        [updated.trip_id]
      );
    }

    return updated ? this.mapGuestRow(updated) : null;
  }

  /**
   * Remove a guest
   */
  async removeGuest(shareCode: string, guestId: number): Promise<boolean> {
    const guest = await this.queryOne<{ id: number; trip_id: number; name: string }>(
      `SELECT tg.id, tg.trip_id, tg.name
       FROM trip_guests tg
       JOIN trips t ON tg.trip_id = t.id
       WHERE t.share_code = $1 AND tg.id = $2`,
      [shareCode, guestId]
    );

    if (!guest) return false;

    await this.logActivity(guest.trip_id, 'guest_removed', `Removed guest: ${guest.name}`, {
      guest_id: guestId,
    });

    return this.delete('trip_guests', guestId);
  }

  // ==========================================================================
  // Handoff
  // ==========================================================================

  /**
   * Request handoff to Walla Walla Travel planning team
   */
  async requestHandoff(shareCode: string, notes?: string): Promise<Trip | null> {
    const trip = await this.queryOne<{ id: number }>(
      'SELECT id FROM trips WHERE share_code = $1',
      [shareCode]
    );

    if (!trip) return null;

    await this.query(
      `UPDATE trips
       SET status = 'handed_off',
           handoff_requested_at = NOW(),
           handoff_notes = $2
       WHERE id = $1`,
      [trip.id, notes || null]
    );

    await this.logActivity(trip.id, 'handoff_requested', 'Requested handoff to planning team', {
      notes,
    });

    return this.getTripByShareCode(shareCode);
  }

  // ==========================================================================
  // Stats
  // ==========================================================================

  /**
   * Get trip statistics
   */
  async getStats(tripId: number): Promise<TripStats> {
    const stats = await this.queryOne<{
      total_stops: string;
      attending: string;
      pending: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM trip_stops WHERE trip_id = $1) as total_stops,
        (SELECT COUNT(*) FROM trip_guests WHERE trip_id = $1 AND rsvp_status = 'attending') as attending,
        (SELECT COUNT(*) FROM trip_guests WHERE trip_id = $1 AND rsvp_status IN ('pending', 'invited', 'maybe')) as pending`,
      [tripId]
    );

    return {
      total_stops: parseInt(stats?.total_stops || '0', 10),
      attending_guests: parseInt(stats?.attending || '0', 10),
      pending_rsvps: parseInt(stats?.pending || '0', 10),
    };
  }

  // ==========================================================================
  // Activity Log
  // ==========================================================================

  /**
   * Log activity for a trip
   */
  private async logActivity(
    tripId: number,
    activityType: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.insert('trip_activity_log', {
      trip_id: tripId,
      activity_type: activityType,
      description,
      metadata: metadata || null,
    });
  }

  // ==========================================================================
  // Row Mappers
  // ==========================================================================

  private mapTripRow(row: TripRow): TripBase {
    return {
      id: row.id,
      share_code: row.share_code,
      title: row.title,
      trip_type: row.trip_type as TripBase['trip_type'],
      description: row.description || undefined,
      start_date: row.start_date || undefined,
      end_date: row.end_date || undefined,
      dates_flexible: row.dates_flexible,
      expected_guests: row.expected_guests,
      owner_name: row.owner_name || undefined,
      owner_email: row.owner_email || undefined,
      owner_phone: row.owner_phone || undefined,
      preferences: row.preferences,
      is_public: row.is_public,
      status: row.status as TripBase['status'],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapStopRow(row: StopRow & { winery_name?: string }): TripStop {
    return {
      id: row.id,
      trip_id: row.trip_id,
      winery_id: row.winery_id || undefined,
      winery_name: row.winery_name || undefined,
      name: row.name,
      stop_type: row.stop_type as TripStop['stop_type'],
      day_number: row.day_number,
      stop_order: row.stop_order,
      planned_arrival: row.planned_arrival || undefined,
      planned_departure: row.planned_departure || undefined,
      notes: row.notes || undefined,
      created_at: row.created_at,
    };
  }

  private mapGuestRow(row: GuestRow): TripGuest {
    return {
      id: row.id,
      trip_id: row.trip_id,
      name: row.name,
      email: row.email || undefined,
      dietary_restrictions: row.dietary_restrictions || undefined,
      is_organizer: row.is_organizer,
      rsvp_status: row.rsvp_status as TripGuest['rsvp_status'],
      created_at: row.created_at,
    };
  }
}

export const tripService = new TripService();
