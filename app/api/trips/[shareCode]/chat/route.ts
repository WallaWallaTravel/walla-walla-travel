import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { tripAIService, TripChatMessage } from '@/lib/services/trip-ai.service';
import { Trip, TripStop, TripGuest, TripType, StopType, RsvpStatus } from '@/lib/types/trip-planner';
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
  const tripRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM trips WHERE share_code = ${shareCode}
  `;

  if (tripRows.length === 0) {
    return null;
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

  const stops: TripStop[] = stopsRows.map((row) => ({
    id: row.id as number,
    trip_id: row.trip_id as number,
    stop_type: row.stop_type as StopType,
    name: row.name as string,
    winery_id: (row.winery_id as number | null) ?? undefined,
    winery_name: (row.winery_name as string | null) ?? undefined,
    day_number: row.day_number as number,
    stop_order: row.stop_order as number,
    planned_arrival: (row.planned_arrival as string | null) ?? undefined,
    planned_departure: (row.planned_departure as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    created_at: row.created_at as string,
  }));

  const guests: TripGuest[] = guestsRows.map((row) => ({
    id: row.id as number,
    trip_id: row.trip_id as number,
    name: row.name as string,
    email: (row.email as string | null) ?? undefined,
    dietary_restrictions: (row.dietary_restrictions as string | null) ?? undefined,
    is_organizer: row.is_organizer as boolean,
    rsvp_status: row.rsvp_status as RsvpStatus,
    created_at: row.created_at as string,
  }));

  // Calculate stats
  const attendingGuests = guests.filter((g) => g.rsvp_status === 'attending').length;
  const pendingRsvps = guests.filter(
    (g) => g.rsvp_status === 'pending' || g.rsvp_status === 'invited'
  ).length;

  return {
    id: trip.id as number,
    share_code: trip.share_code as string,
    title: trip.title as string,
    description: (trip.description as string | null) ?? undefined,
    trip_type: trip.trip_type as TripType,
    start_date: (trip.start_date as string | null) ?? undefined,
    end_date: (trip.end_date as string | null) ?? undefined,
    dates_flexible: trip.dates_flexible as boolean,
    expected_guests: trip.expected_guests as number,
    owner_name: (trip.owner_name as string | null) ?? undefined,
    owner_email: (trip.owner_email as string | null) ?? undefined,
    owner_phone: (trip.owner_phone as string | null) ?? undefined,
    preferences: (trip.preferences || { transportation: 'undecided', pace: 'moderate', budget: 'moderate' }) as Trip['preferences'],
    status: trip.status as Trip['status'],
    is_public: trip.is_public as boolean,
    created_at: trip.created_at as string,
    updated_at: trip.updated_at as string,
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
