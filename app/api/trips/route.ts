import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { createTripSchema } from '@/lib/validation/schemas/trip';
import { nanoid } from 'nanoid';

// ============================================================================
// POST /api/trips - Create a new trip
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = createTripSchema.parse(body);

  // Generate unique share code
  const shareCode = nanoid(8);

  const result = await query(
    `INSERT INTO trips (
      share_code, title, description, trip_type,
      start_date, end_date, dates_flexible,
      expected_guests, owner_name, owner_email, owner_phone,
      preferences, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft'
    )
    RETURNING *`,
    [
      shareCode,
      validated.title,
      validated.description || null,
      validated.trip_type,
      validated.start_date || null,
      validated.end_date || null,
      validated.dates_flexible,
      validated.expected_guests,
      validated.owner_name || null,
      validated.owner_email || null,
      validated.owner_phone || null,
      JSON.stringify(validated.preferences || { transportation: 'undecided', pace: 'moderate', budget: 'moderate' }),
    ]
  );

  const trip = result.rows[0];

  // Log activity
  await query(
    `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_name)
     VALUES ($1, 'trip_created', 'Trip created', $2)`,
    [trip.id, validated.owner_name || 'Anonymous']
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
      // Include empty arrays for frontend compatibility
      stops: [],
      guests: [],
      stats: {
        total_stops: 0,
        confirmed_stops: 0,
        total_guests: 0,
        attending_guests: 0,
        pending_rsvps: 0,
      },
    },
  }, { status: 201 });
});
