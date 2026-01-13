import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { updateTripSchema } from '@/lib/validation/schemas/trip';

interface RouteParams {
  shareCode: string;
}

// ============================================================================
// GET /api/trips/[shareCode] - Get trip by share code with stops and guests
// ============================================================================

export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;

    // Get trip
    const tripResult = await query(
      `SELECT * FROM trips WHERE share_code = $1`,
      [shareCode]
    );

    if (tripResult.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = tripResult.rows[0];

    // Get stops and guests in parallel
    const [stopsResult, guestsResult] = await Promise.all([
      query(
        `SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY day_number, stop_order`,
        [trip.id]
      ),
      query(
        `SELECT * FROM trip_guests WHERE trip_id = $1 ORDER BY is_organizer DESC, name ASC`,
        [trip.id]
      ),
    ]);

    const stops = stopsResult.rows.map(row => ({
      id: row.id,
      trip_id: row.trip_id,
      stop_type: row.stop_type,
      name: row.name,
      description: row.description,
      winery_id: row.winery_id,
      day_number: row.day_number,
      stop_order: row.stop_order,
      planned_arrival: row.planned_arrival,
      planned_departure: row.planned_departure,
      duration_minutes: row.duration_minutes,
      status: row.status,
      booking_confirmation: row.booking_confirmation,
      notes: row.notes,
      special_requests: row.special_requests,
      estimated_cost_per_person: row.estimated_cost_per_person ? parseFloat(row.estimated_cost_per_person) : null,
      added_by: row.added_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const guests = guestsResult.rows.map(row => ({
      id: row.id,
      trip_id: row.trip_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      rsvp_status: row.rsvp_status,
      rsvp_responded_at: row.rsvp_responded_at,
      rsvp_notes: row.rsvp_notes,
      is_organizer: row.is_organizer,
      dietary_restrictions: row.dietary_restrictions,
      accessibility_needs: row.accessibility_needs,
      invite_sent_at: row.invite_sent_at,
      last_viewed_at: row.last_viewed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    // Calculate stats
    const attendingGuests = guests.filter(g => g.rsvp_status === 'attending').length;
    const pendingRsvps = guests.filter(g => g.rsvp_status === 'pending' || g.rsvp_status === 'invited').length;
    const confirmedStops = stops.filter(s => s.status === 'confirmed' || s.status === 'booked').length;

    return NextResponse.json({
      success: true,
      data: {
        id: trip.id,
        share_code: trip.share_code,
        title: trip.title,
        description: trip.description,
        trip_type: trip.trip_type,
        start_date: trip.start_date,
        end_date: trip.end_date,
        dates_flexible: trip.dates_flexible,
        expected_guests: trip.expected_guests,
        confirmed_guests: trip.confirmed_guests,
        owner_name: trip.owner_name,
        owner_email: trip.owner_email,
        owner_phone: trip.owner_phone,
        preferences: trip.preferences,
        status: trip.status,
        is_public: trip.is_public,
        allow_guest_suggestions: trip.allow_guest_suggestions,
        allow_guest_rsvp: trip.allow_guest_rsvp,
        handoff_requested_at: trip.handoff_requested_at,
        handoff_notes: trip.handoff_notes,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
        last_activity_at: trip.last_activity_at,
        // Related data
        stops,
        guests,
        stats: {
          total_stops: stops.length,
          confirmed_stops: confirmedStops,
          total_guests: guests.length,
          attending_guests: attendingGuests,
          pending_rsvps: pendingRsvps,
        },
      },
    });
  }
);

// ============================================================================
// PATCH /api/trips/[shareCode] - Update trip
// ============================================================================

export const PATCH = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    const body = await request.json();
    const validated = updateTripSchema.parse(body);

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validated.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(validated.title);
    }
    if (validated.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(validated.description);
    }
    if (validated.trip_type !== undefined) {
      updates.push(`trip_type = $${paramIndex++}`);
      values.push(validated.trip_type);
    }
    if (validated.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(validated.start_date);
    }
    if (validated.end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(validated.end_date);
    }
    if (validated.dates_flexible !== undefined) {
      updates.push(`dates_flexible = $${paramIndex++}`);
      values.push(validated.dates_flexible);
    }
    if (validated.expected_guests !== undefined) {
      updates.push(`expected_guests = $${paramIndex++}`);
      values.push(validated.expected_guests);
    }
    if (validated.owner_name !== undefined) {
      updates.push(`owner_name = $${paramIndex++}`);
      values.push(validated.owner_name);
    }
    if (validated.owner_email !== undefined) {
      updates.push(`owner_email = $${paramIndex++}`);
      values.push(validated.owner_email);
    }
    if (validated.owner_phone !== undefined) {
      updates.push(`owner_phone = $${paramIndex++}`);
      values.push(validated.owner_phone);
    }
    if (validated.is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(validated.is_public);
    }
    if (validated.allow_guest_suggestions !== undefined) {
      updates.push(`allow_guest_suggestions = $${paramIndex++}`);
      values.push(validated.allow_guest_suggestions);
    }
    if (validated.allow_guest_rsvp !== undefined) {
      updates.push(`allow_guest_rsvp = $${paramIndex++}`);
      values.push(validated.allow_guest_rsvp);
    }
    if (validated.preferences !== undefined) {
      updates.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(validated.preferences));
    }
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(validated.status);
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(shareCode);

    const result = await query(
      `UPDATE trips SET ${updates.join(', ')}, updated_at = NOW()
       WHERE share_code = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_name)
       VALUES ($1, 'trip_updated', 'Trip updated', $2)`,
      [trip.id, trip.owner_name || 'Anonymous']
    );

    return NextResponse.json({
      success: true,
      data: {
        id: trip.id,
        share_code: trip.share_code,
        title: trip.title,
        description: trip.description,
        trip_type: trip.trip_type,
        start_date: trip.start_date,
        end_date: trip.end_date,
        dates_flexible: trip.dates_flexible,
        expected_guests: trip.expected_guests,
        confirmed_guests: trip.confirmed_guests,
        owner_name: trip.owner_name,
        owner_email: trip.owner_email,
        owner_phone: trip.owner_phone,
        preferences: trip.preferences,
        status: trip.status,
        is_public: trip.is_public,
        allow_guest_suggestions: trip.allow_guest_suggestions,
        allow_guest_rsvp: trip.allow_guest_rsvp,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
      },
    });
  }
);
