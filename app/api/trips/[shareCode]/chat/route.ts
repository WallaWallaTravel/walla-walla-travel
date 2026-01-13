import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { tripAIService, TripChatMessage } from '@/lib/services/trip-ai.service';
import { Trip, TripStop, TripGuest } from '@/lib/types/trip-planner';
import { z } from 'zod';

interface RouteParams {
  shareCode: string;
}

// ============================================================================
// Validation
// ============================================================================

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string(),
        actions: z.array(z.any()).optional(),
      })
    )
    .optional()
    .default([]),
});

// ============================================================================
// Helper: Load full trip data
// ============================================================================

async function loadTripWithRelations(shareCode: string): Promise<Trip | null> {
  // Get trip
  const tripResult = await query(
    `SELECT * FROM trips WHERE share_code = $1`,
    [shareCode]
  );

  if (tripResult.rows.length === 0) {
    return null;
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

  const stops: TripStop[] = stopsResult.rows.map((row) => ({
    id: row.id,
    trip_id: row.trip_id,
    stop_type: row.stop_type,
    name: row.name,
    winery_id: row.winery_id,
    winery_name: row.winery_name,
    day_number: row.day_number,
    stop_order: row.stop_order,
    planned_arrival: row.planned_arrival,
    planned_departure: row.planned_departure,
    notes: row.notes,
    created_at: row.created_at,
  }));

  const guests: TripGuest[] = guestsResult.rows.map((row) => ({
    id: row.id,
    trip_id: row.trip_id,
    name: row.name,
    email: row.email,
    dietary_restrictions: row.dietary_restrictions,
    is_organizer: row.is_organizer,
    rsvp_status: row.rsvp_status,
    created_at: row.created_at,
  }));

  // Calculate stats
  const attendingGuests = guests.filter((g) => g.rsvp_status === 'attending').length;
  const pendingRsvps = guests.filter(
    (g) => g.rsvp_status === 'pending' || g.rsvp_status === 'invited'
  ).length;

  return {
    id: trip.id,
    share_code: trip.share_code,
    title: trip.title,
    description: trip.description,
    trip_type: trip.trip_type,
    start_date: trip.start_date,
    end_date: trip.end_date,
    dates_flexible: trip.dates_flexible,
    expected_guests: trip.expected_guests,
    owner_name: trip.owner_name,
    owner_email: trip.owner_email,
    owner_phone: trip.owner_phone,
    preferences: trip.preferences || { transportation: 'undecided', pace: 'moderate', budget: 'moderate' },
    status: trip.status,
    is_public: trip.is_public,
    created_at: trip.created_at,
    updated_at: trip.updated_at,
    stops,
    guests,
    stats: {
      total_stops: stops.length,
      attending_guests: attendingGuests,
      pending_rsvps: pendingRsvps,
    },
  };
}

// ============================================================================
// POST /api/trips/[shareCode]/chat - Send a chat message
// ============================================================================

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    const body = await request.json();

    // Validate request
    const validated = chatRequestSchema.parse(body);

    // Load trip with all relations
    const trip = await loadTripWithRelations(shareCode);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // Call AI service
    const response = await tripAIService.chat(
      trip,
      validated.message,
      validated.history as TripChatMessage[]
    );

    // Get proactive tip if no actions were suggested
    const proactiveTip = !response.actions?.length
      ? tripAIService.getProactiveTip(trip)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        message: response.message,
        actions: response.actions,
        refreshSuggestions: response.refreshSuggestions,
        proactiveTip,
      },
    });
  }
);
