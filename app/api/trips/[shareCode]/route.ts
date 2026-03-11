import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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
    const tripRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM trips WHERE share_code = ${shareCode}
    `;

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = tripRows[0];

    // Get stops and guests in parallel
    const [stopsRows, guestsRows] = await Promise.all([
      prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM trip_stops WHERE trip_id = ${trip.id} ORDER BY day_number, stop_order
      `,
      prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM trip_guests WHERE trip_id = ${trip.id} ORDER BY is_organizer DESC, name ASC
      `,
    ]);

    const stops = stopsRows.map(row => ({
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
      estimated_cost_per_person: row.estimated_cost_per_person ? parseFloat(row.estimated_cost_per_person as string) : null,
      added_by: row.added_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const guests = guestsRows.map(row => ({
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
    const updates: Prisma.Sql[] = [];
    const values: unknown[] = [];

    if (validated.title !== undefined) {
      updates.push(Prisma.sql`title = ${validated.title}`);
    }
    if (validated.description !== undefined) {
      updates.push(Prisma.sql`description = ${validated.description}`);
    }
    if (validated.trip_type !== undefined) {
      updates.push(Prisma.sql`trip_type = ${validated.trip_type}`);
    }
    if (validated.start_date !== undefined) {
      updates.push(Prisma.sql`start_date = ${validated.start_date}`);
    }
    if (validated.end_date !== undefined) {
      updates.push(Prisma.sql`end_date = ${validated.end_date}`);
    }
    if (validated.dates_flexible !== undefined) {
      updates.push(Prisma.sql`dates_flexible = ${validated.dates_flexible}`);
    }
    if (validated.expected_guests !== undefined) {
      updates.push(Prisma.sql`expected_guests = ${validated.expected_guests}`);
    }
    if (validated.owner_name !== undefined) {
      updates.push(Prisma.sql`owner_name = ${validated.owner_name}`);
    }
    if (validated.owner_email !== undefined) {
      updates.push(Prisma.sql`owner_email = ${validated.owner_email}`);
    }
    if (validated.owner_phone !== undefined) {
      updates.push(Prisma.sql`owner_phone = ${validated.owner_phone}`);
    }
    if (validated.is_public !== undefined) {
      updates.push(Prisma.sql`is_public = ${validated.is_public}`);
    }
    if (validated.allow_guest_suggestions !== undefined) {
      updates.push(Prisma.sql`allow_guest_suggestions = ${validated.allow_guest_suggestions}`);
    }
    if (validated.allow_guest_rsvp !== undefined) {
      updates.push(Prisma.sql`allow_guest_rsvp = ${validated.allow_guest_rsvp}`);
    }
    if (validated.preferences !== undefined) {
      updates.push(Prisma.sql`preferences = ${JSON.stringify(validated.preferences)}`);
    }
    if (validated.status !== undefined) {
      updates.push(Prisma.sql`status = ${validated.status}`);
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = Prisma.join(updates, ', ');

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      UPDATE trips SET ${setClause}, updated_at = NOW()
       WHERE share_code = ${shareCode}
       RETURNING *
    `;

    if (rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = rows[0];

    // Log activity
    await prisma.$executeRaw`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_name)
       VALUES (${trip.id as number}, 'trip_updated', 'Trip updated', ${(trip.owner_name as string) || 'Anonymous'})
    `;

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
