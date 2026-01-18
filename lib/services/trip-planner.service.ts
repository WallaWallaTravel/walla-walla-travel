import { BaseService } from './base.service';
import { query } from '@/lib/db';
import {
  Trip,
  TripStop,
  TripGuest,
  TripMessage,
  TripActivityLog,
  TripSuggestion,
  TripSummary,
  TripDashboard,
  CreateTripRequest,
  UpdateTripRequest,
  AddStopRequest,
  AddGuestRequest,
  SendMessageRequest,
  HandoffRequest,
  TripStatus,
  RSVPStatus,
} from '@/lib/types/trip-planner';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { nanoid } from 'nanoid';

// ============================================================================
// Trip Planner Service
// ============================================================================

class TripPlannerService extends BaseService {
  protected get serviceName(): string {
    return 'TripPlannerService';
  }

  // ==========================================================================
  // Share Code Generation
  // ==========================================================================

  private generateShareCode(): string {
    // Generate a short, URL-friendly code (8 chars)
    return nanoid(8);
  }

  // ==========================================================================
  // TRIPS - CRUD Operations
  // ==========================================================================

  async createTrip(data: CreateTripRequest, visitorId?: string, userId?: number): Promise<Trip> {
    const shareCode = this.generateShareCode();
    
    const result = await query(`
      INSERT INTO trips (
        share_code, visitor_id, user_id, 
        title, description, trip_type,
        start_date, end_date, dates_flexible,
        expected_guests, owner_name, owner_email, owner_phone,
        preferences, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft'
      )
      RETURNING *
    `, [
      shareCode,
      visitorId,
      userId,
      data.title,
      data.description,
      data.trip_type || 'wine_tour',
      data.start_date,
      data.end_date,
      data.dates_flexible ?? true,
      data.expected_guests || 1,
      data.owner_name,
      data.owner_email,
      data.owner_phone,
      JSON.stringify(data.preferences || {}),
    ]);

    const trip = this.mapTrip(result.rows[0]);
    
    // Log activity
    await this.logActivity(trip.id, 'trip_created', 'Trip created', visitorId || String(userId));
    
    return trip;
  }

  async getTripByShareCode(shareCode: string): Promise<Trip | null> {
    const result = await query(`
      SELECT * FROM trips WHERE share_code = $1
    `, [shareCode]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTrip(result.rows[0]);
  }

  async getTripById(id: number): Promise<Trip | null> {
    const result = await query(`
      SELECT * FROM trips WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTrip(result.rows[0]);
  }

  async getTripDashboard(tripId: number): Promise<TripDashboard> {
    const trip = await this.getTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    const [stops, guests, activity, suggestions] = await Promise.all([
      this.getStops(tripId),
      this.getGuests(tripId),
      this.getRecentActivity(tripId, 10),
      this.getPendingSuggestions(tripId),
    ]);

    const attendingGuests = guests.filter(g => g.rsvp_status === 'attending').length;
    const pendingRsvps = guests.filter(g => g.rsvp_status === 'pending' || g.rsvp_status === 'invited').length;
    const confirmedStops = stops.filter(s => s.status === 'confirmed' || s.status === 'booked').length;
    const estimatedCost = stops.reduce((sum, s) => sum + (s.estimated_cost_per_person || 0), 0);

    return {
      trip,
      stops,
      guests,
      recent_activity: activity,
      pending_suggestions: suggestions,
      stats: {
        total_stops: stops.length,
        confirmed_stops: confirmedStops,
        total_guests: guests.length,
        attending_guests: attendingGuests,
        pending_rsvps: pendingRsvps,
        estimated_total_cost: estimatedCost * (attendingGuests || 1),
      },
    };
  }

  async updateTrip(tripId: number, data: UpdateTripRequest): Promise<Trip> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.trip_type !== undefined) {
      updates.push(`trip_type = $${paramIndex++}`);
      values.push(data.trip_type);
    }
    if (data.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(data.start_date);
    }
    if (data.end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(data.end_date);
    }
    if (data.dates_flexible !== undefined) {
      updates.push(`dates_flexible = $${paramIndex++}`);
      values.push(data.dates_flexible);
    }
    if (data.expected_guests !== undefined) {
      updates.push(`expected_guests = $${paramIndex++}`);
      values.push(data.expected_guests);
    }
    if (data.owner_name !== undefined) {
      updates.push(`owner_name = $${paramIndex++}`);
      values.push(data.owner_name);
    }
    if (data.owner_email !== undefined) {
      updates.push(`owner_email = $${paramIndex++}`);
      values.push(data.owner_email);
    }
    if (data.owner_phone !== undefined) {
      updates.push(`owner_phone = $${paramIndex++}`);
      values.push(data.owner_phone);
    }
    if (data.is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(data.is_public);
    }
    if (data.allow_guest_suggestions !== undefined) {
      updates.push(`allow_guest_suggestions = $${paramIndex++}`);
      values.push(data.allow_guest_suggestions);
    }
    if (data.allow_guest_rsvp !== undefined) {
      updates.push(`allow_guest_rsvp = $${paramIndex++}`);
      values.push(data.allow_guest_rsvp);
    }
    if (data.preferences !== undefined) {
      updates.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(data.preferences));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`last_activity_at = CURRENT_TIMESTAMP`);
    values.push(tripId);

    const result = await query(`
      UPDATE trips SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    return this.mapTrip(result.rows[0]);
  }

  async updateTripStatus(tripId: number, status: TripStatus): Promise<Trip> {
    const result = await query(`
      UPDATE trips 
      SET status = $1, updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, tripId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    await this.logActivity(tripId, 'status_changed', `Status changed to ${status}`, 'system');

    return this.mapTrip(result.rows[0]);
  }

  async getTripsForVisitor(visitorId: string): Promise<TripSummary[]> {
    const result = await query(`
      SELECT 
        t.*,
        COUNT(DISTINCT ts.id) as stops_count
      FROM trips t
      LEFT JOIN trip_stops ts ON t.id = ts.trip_id
      WHERE t.visitor_id = $1
      GROUP BY t.id
      ORDER BY t.last_activity_at DESC
    `, [visitorId]);

    return result.rows.map(row => ({
      id: row.id,
      share_code: row.share_code,
      title: row.title,
      trip_type: row.trip_type,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      expected_guests: row.expected_guests,
      confirmed_guests: row.confirmed_guests,
      stops_count: parseInt(row.stops_count) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_activity_at: row.last_activity_at,
    }));
  }

  // ==========================================================================
  // STOPS - Itinerary Management
  // ==========================================================================

  async addStop(tripId: number, data: AddStopRequest, addedBy?: string): Promise<TripStop> {
    // Get max stop order for this day
    const orderResult = await query(`
      SELECT COALESCE(MAX(stop_order), 0) + 1 as next_order
      FROM trip_stops
      WHERE trip_id = $1 AND day_number = $2
    `, [tripId, data.day_number || 1]);

    const stopOrder = orderResult.rows[0].next_order;

    const result = await query(`
      INSERT INTO trip_stops (
        trip_id, stop_type, name, description,
        winery_id, restaurant_id,
        day_number, stop_order,
        planned_arrival, planned_departure, duration_minutes,
        notes, special_requests, estimated_cost_per_person,
        added_by, added_via, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'manual', 'suggested'
      )
      RETURNING *
    `, [
      tripId,
      data.stop_type,
      data.name,
      data.description,
      data.winery_id,
      data.restaurant_id,
      data.day_number || 1,
      stopOrder,
      data.planned_arrival,
      data.planned_departure,
      data.duration_minutes,
      data.notes,
      data.special_requests,
      data.estimated_cost_per_person,
      addedBy,
    ]);

    // Update trip activity
    await query(`
      UPDATE trips SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [tripId]);

    await this.logActivity(tripId, 'stop_added', `Added stop: ${data.name}`, addedBy);

    return this.mapStop(result.rows[0]);
  }

  async getStops(tripId: number): Promise<TripStop[]> {
    const result = await query(`
      SELECT 
        ts.*,
        w.name as winery_name,
        w.image_url as winery_image,
        w.wine_styles as winery_wine_styles,
        r.name as restaurant_name,
        r.cuisine_type as restaurant_cuisine
      FROM trip_stops ts
      LEFT JOIN wineries w ON ts.winery_id = w.id
      LEFT JOIN restaurants r ON ts.restaurant_id = r.id
      WHERE ts.trip_id = $1
      ORDER BY ts.day_number, ts.stop_order
    `, [tripId]);

    return result.rows.map(row => this.mapStop(row));
  }

  async updateStopOrder(tripId: number, stopId: number, newDayNumber: number, newOrder: number): Promise<void> {
    await query(`
      UPDATE trip_stops
      SET day_number = $1, stop_order = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND trip_id = $4
    `, [newDayNumber, newOrder, stopId, tripId]);

    await query(`
      UPDATE trips SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [tripId]);
  }

  async removeStop(tripId: number, stopId: number): Promise<void> {
    const stopResult = await query(`
      SELECT name FROM trip_stops WHERE id = $1 AND trip_id = $2
    `, [stopId, tripId]);

    if (stopResult.rows.length === 0) {
      throw new NotFoundError('Stop not found');
    }

    await query(`
      DELETE FROM trip_stops WHERE id = $1 AND trip_id = $2
    `, [stopId, tripId]);

    await this.logActivity(tripId, 'stop_removed', `Removed stop: ${stopResult.rows[0].name}`, 'system');
  }

  // ==========================================================================
  // GUESTS - Contact Management
  // ==========================================================================

  async addGuest(tripId: number, data: AddGuestRequest): Promise<TripGuest> {
    const result = await query(`
      INSERT INTO trip_guests (
        trip_id, name, email, phone,
        is_organizer, dietary_restrictions, accessibility_needs,
        arrival_date, departure_date, rsvp_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending'
      )
      RETURNING *
    `, [
      tripId,
      data.name,
      data.email,
      data.phone,
      data.is_organizer || false,
      data.dietary_restrictions,
      data.accessibility_needs,
      data.arrival_date,
      data.departure_date,
    ]);

    await this.logActivity(tripId, 'guest_added', `Added guest: ${data.name}`, 'system');

    return this.mapGuest(result.rows[0]);
  }

  async getGuests(tripId: number): Promise<TripGuest[]> {
    const result = await query(`
      SELECT * FROM trip_guests
      WHERE trip_id = $1
      ORDER BY is_organizer DESC, name ASC
    `, [tripId]);

    return result.rows.map(row => this.mapGuest(row));
  }

  async updateGuestRSVP(tripId: number, guestId: number, status: RSVPStatus, notes?: string): Promise<TripGuest> {
    const result = await query(`
      UPDATE trip_guests
      SET rsvp_status = $1, rsvp_notes = $2, rsvp_responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND trip_id = $4
      RETURNING *
    `, [status, notes, guestId, tripId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Guest not found');
    }

    // Update confirmed count
    if (status === 'attending') {
      await query(`
        UPDATE trips 
        SET confirmed_guests = (
          SELECT COUNT(*) FROM trip_guests WHERE trip_id = $1 AND rsvp_status = 'attending'
        )
        WHERE id = $1
      `, [tripId]);
    }

    await this.logActivity(tripId, 'guest_rsvp', `${result.rows[0].name} RSVP: ${status}`, 'guest');

    return this.mapGuest(result.rows[0]);
  }

  async removeGuest(tripId: number, guestId: number): Promise<void> {
    const guestResult = await query(`
      SELECT name FROM trip_guests WHERE id = $1 AND trip_id = $2
    `, [guestId, tripId]);

    if (guestResult.rows.length === 0) {
      throw new NotFoundError('Guest not found');
    }

    await query(`
      DELETE FROM trip_guests WHERE id = $1 AND trip_id = $2
    `, [guestId, tripId]);

    await this.logActivity(tripId, 'guest_removed', `Removed guest: ${guestResult.rows[0].name}`, 'system');
  }

  async importGuests(tripId: number, guests: AddGuestRequest[]): Promise<TripGuest[]> {
    const results: TripGuest[] = [];
    
    for (const guest of guests) {
      const added = await this.addGuest(tripId, guest);
      results.push(added);
    }

    return results;
  }

  // ==========================================================================
  // MESSAGES - Communication
  // ==========================================================================

  async sendMessage(tripId: number, data: SendMessageRequest, senderId?: string): Promise<TripMessage> {
    const result = await query(`
      INSERT INTO trip_messages (
        trip_id, message_type, subject, content,
        send_to_all, recipient_guest_ids,
        delivery_method, scheduled_for,
        sender_name, sender_email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *
    `, [
      tripId,
      data.message_type,
      data.subject,
      data.content,
      data.send_to_all ?? true,
      data.recipient_guest_ids,
      data.delivery_method || 'email',
      data.scheduled_for,
      null, // Will be populated from trip owner
      null,
    ]);

    const message = this.mapMessage(result.rows[0]);

    // If not scheduled, send immediately
    if (!data.scheduled_for) {
      await this.deliverMessage(message);
    }

    await this.logActivity(tripId, 'message_sent', `Sent ${data.message_type}: ${data.subject || 'No subject'}`, senderId);

    return message;
  }

  private async deliverMessage(message: TripMessage): Promise<void> {
    // Get recipients
    const guestsResult = await query(`
      SELECT * FROM trip_guests WHERE trip_id = $1
      ${message.send_to_all ? '' : 'AND id = ANY($2)'}
    `, message.send_to_all ? [message.trip_id] : [message.trip_id, message.recipient_guest_ids]);

    // Create receipts for each recipient
    for (const guest of guestsResult.rows) {
      await query(`
        INSERT INTO trip_message_receipts (message_id, guest_id, delivery_status)
        VALUES ($1, $2, 'pending')
        ON CONFLICT (message_id, guest_id) DO NOTHING
      `, [message.id, guest.id]);
    }

    // Mark message as sent
    await query(`
      UPDATE trip_messages SET sent_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [message.id]);

    // TODO: Actually send emails via Resend
    // This would integrate with the existing email service
  }

  // ==========================================================================
  // HANDOFF - Transfer to Walla Walla Travel
  // ==========================================================================

  async requestHandoff(tripId: number, data: HandoffRequest): Promise<Trip> {
    const result = await query(`
      UPDATE trips
      SET 
        handoff_requested_at = CURRENT_TIMESTAMP,
        handoff_notes = $1,
        status = 'handed_off',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [data.notes, tripId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    await this.logActivity(tripId, 'handoff_requested', 'Requested handoff to Walla Walla Travel', 'organizer');

    // TODO: Send notification to staff

    return this.mapTrip(result.rows[0]);
  }

  async getHandoffRequests(): Promise<Trip[]> {
    const result = await query(`
      SELECT * FROM trips
      WHERE handoff_requested_at IS NOT NULL
        AND status = 'handed_off'
        AND converted_to_booking_id IS NULL
      ORDER BY handoff_requested_at ASC
    `);

    return result.rows.map(row => this.mapTrip(row));
  }

  async assignStaffToTrip(tripId: number, staffId: number): Promise<Trip> {
    const result = await query(`
      UPDATE trips
      SET assigned_staff_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [staffId, tripId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    await this.logActivity(tripId, 'staff_assigned', 'Staff member assigned', 'staff');

    return this.mapTrip(result.rows[0]);
  }

  async convertToBooking(tripId: number, bookingId: number): Promise<Trip> {
    const result = await query(`
      UPDATE trips
      SET 
        converted_to_booking_id = $1,
        status = 'booked',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [bookingId, tripId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    await this.logActivity(tripId, 'converted_to_booking', `Converted to booking #${bookingId}`, 'staff');

    return this.mapTrip(result.rows[0]);
  }

  // ==========================================================================
  // ACTIVITY LOG
  // ==========================================================================

  private async logActivity(
    tripId: number, 
    activityType: string, 
    description: string, 
    actorId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await query(`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [tripId, activityType, description, actorId, metadata ? JSON.stringify(metadata) : null]);
  }

  async getRecentActivity(tripId: number, limit: number = 20): Promise<TripActivityLog[]> {
    const result = await query(`
      SELECT * FROM trip_activity_log
      WHERE trip_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [tripId, limit]);

    return result.rows.map(row => ({
      id: row.id,
      trip_id: row.trip_id,
      activity_type: row.activity_type,
      description: row.description,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      actor_name: row.actor_name,
      metadata: row.metadata,
      created_at: row.created_at,
    }));
  }

  // ==========================================================================
  // SUGGESTIONS
  // ==========================================================================

  async getPendingSuggestions(tripId: number): Promise<TripSuggestion[]> {
    const result = await query(`
      SELECT 
        s.*,
        w.name as winery_name,
        w.image_url as winery_image
      FROM trip_suggestions s
      LEFT JOIN wineries w ON s.winery_id = w.id
      WHERE s.trip_id = $1 AND s.status = 'pending'
      ORDER BY s.created_at DESC
    `, [tripId]);

    return result.rows.map(row => ({
      id: row.id,
      trip_id: row.trip_id,
      suggestion_type: row.suggestion_type,
      title: row.title,
      description: row.description,
      winery_id: row.winery_id,
      restaurant_id: row.restaurant_id,
      source: row.source,
      source_id: row.source_id,
      status: row.status,
      reason: row.reason,
      created_at: row.created_at,
      responded_at: row.responded_at,
      winery: row.winery_id ? {
        id: row.winery_id,
        name: row.winery_name,
        image_url: row.winery_image,
      } : undefined,
    }));
  }

  // ==========================================================================
  // MAPPERS
  // ==========================================================================

  private mapTrip(row: Record<string, unknown>): Trip {
    return {
      id: row.id as number,
      share_code: row.share_code as string,
      visitor_id: row.visitor_id as string | undefined,
      user_id: row.user_id as number | undefined,
      owner_name: row.owner_name as string | undefined,
      owner_email: row.owner_email as string | undefined,
      owner_phone: row.owner_phone as string | undefined,
      title: row.title as string,
      description: row.description as string | undefined,
      trip_type: row.trip_type as Trip['trip_type'],
      start_date: row.start_date as string | undefined,
      end_date: row.end_date as string | undefined,
      dates_flexible: row.dates_flexible as boolean,
      expected_guests: row.expected_guests as number,
      confirmed_guests: row.confirmed_guests as number,
      status: row.status as Trip['status'],
      is_public: row.is_public as boolean,
      allow_guest_suggestions: row.allow_guest_suggestions as boolean,
      allow_guest_rsvp: row.allow_guest_rsvp as boolean,
      handoff_requested_at: row.handoff_requested_at as string | undefined,
      handoff_notes: row.handoff_notes as string | undefined,
      assigned_staff_id: row.assigned_staff_id as number | undefined,
      converted_to_booking_id: row.converted_to_booking_id as number | undefined,
      preferences: (row.preferences as Trip['preferences']) || {},
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_activity_at: row.last_activity_at as string,
      // Default empty arrays for collections - will be populated separately
      stops: [],
      guests: [],
      stats: { total_stops: 0, attending_guests: 0, pending_rsvps: 0 },
    };
  }

  private mapStop(row: Record<string, unknown>): TripStop {
    return {
      id: row.id as number,
      trip_id: row.trip_id as number,
      stop_type: row.stop_type as TripStop['stop_type'],
      name: row.name as string,
      description: row.description as string | undefined,
      winery_id: row.winery_id as number | undefined,
      restaurant_id: row.restaurant_id as number | undefined,
      day_number: row.day_number as number,
      stop_order: row.stop_order as number,
      planned_arrival: row.planned_arrival as string | undefined,
      planned_departure: row.planned_departure as string | undefined,
      duration_minutes: row.duration_minutes as number | undefined,
      status: row.status as TripStop['status'],
      booking_confirmation: row.booking_confirmation as string | undefined,
      notes: row.notes as string | undefined,
      special_requests: row.special_requests as string | undefined,
      estimated_cost_per_person: row.estimated_cost_per_person as number | undefined,
      added_by: row.added_by as string | undefined,
      added_via: row.added_via as TripStop['added_via'],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      winery: row.winery_id ? {
        id: row.winery_id as number,
        name: row.winery_name as string,
        image_url: row.winery_image as string | undefined,
        wine_styles: row.winery_wine_styles as string[] | undefined,
      } : undefined,
      restaurant: row.restaurant_id ? {
        id: row.restaurant_id as number,
        name: row.restaurant_name as string,
        cuisine_type: row.restaurant_cuisine as string | undefined,
      } : undefined,
    };
  }

  private mapGuest(row: Record<string, unknown>): TripGuest {
    return {
      id: row.id as number,
      trip_id: row.trip_id as number,
      name: row.name as string,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      rsvp_status: row.rsvp_status as TripGuest['rsvp_status'],
      rsvp_responded_at: row.rsvp_responded_at as string | undefined,
      rsvp_notes: row.rsvp_notes as string | undefined,
      is_organizer: row.is_organizer as boolean,
      dietary_restrictions: row.dietary_restrictions as string | undefined,
      accessibility_needs: row.accessibility_needs as string | undefined,
      arrival_date: row.arrival_date as string | undefined,
      departure_date: row.departure_date as string | undefined,
      accommodation_group: row.accommodation_group as string | undefined,
      emergency_contact_name: row.emergency_contact_name as string | undefined,
      emergency_contact_phone: row.emergency_contact_phone as string | undefined,
      invite_sent_at: row.invite_sent_at as string | undefined,
      invite_opened_at: row.invite_opened_at as string | undefined,
      last_viewed_at: row.last_viewed_at as string | undefined,
      customer_id: row.customer_id as number | undefined,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  private mapMessage(row: Record<string, unknown>): TripMessage {
    return {
      id: row.id as number,
      trip_id: row.trip_id as number,
      message_type: row.message_type as TripMessage['message_type'],
      subject: row.subject as string | undefined,
      content: row.content as string,
      sender_name: row.sender_name as string | undefined,
      sender_email: row.sender_email as string | undefined,
      sent_by_guest_id: row.sent_by_guest_id as number | undefined,
      sent_by_user_id: row.sent_by_user_id as number | undefined,
      send_to_all: row.send_to_all as boolean,
      recipient_guest_ids: row.recipient_guest_ids as number[] | undefined,
      scheduled_for: row.scheduled_for as string | undefined,
      sent_at: row.sent_at as string | undefined,
      delivery_method: row.delivery_method as TripMessage['delivery_method'],
      template_id: row.template_id as string | undefined,
      created_at: row.created_at as string,
    };
  }
}

export const tripPlannerService = new TripPlannerService();
