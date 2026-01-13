import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { requestHandoffSchema } from '@/lib/validation/schemas/trip';

interface RouteParams {
  shareCode: string;
}

// ============================================================================
// POST /api/trips/[shareCode]/handoff - Request handoff to planning team
// ============================================================================

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    const body = await request.json();
    const validated = requestHandoffSchema.parse(body);

    // Get trip
    const tripResult = await query(
      `SELECT id, title, owner_name, owner_email, status
       FROM trips WHERE share_code = $1`,
      [shareCode]
    );

    if (tripResult.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = tripResult.rows[0];

    // Check if already handed off
    if (trip.status === 'handed_off' || trip.status === 'booked') {
      return NextResponse.json({
        success: false,
        error: 'Trip has already been handed off',
      }, { status: 400 });
    }

    // Update trip status to handed_off
    const updateResult = await query(
      `UPDATE trips
       SET status = 'handed_off',
           handoff_requested_at = NOW(),
           handoff_notes = $2,
           last_activity_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [trip.id, validated.notes || null]
    );

    const updatedTrip = updateResult.rows[0];

    // Log activity
    await query(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_name, metadata)
       VALUES ($1, 'handoff_requested', 'Requested handoff to Walla Walla Travel planning team', $2, $3)`,
      [
        trip.id,
        trip.owner_name || 'Anonymous',
        JSON.stringify({
          notes: validated.notes || null,
          owner_email: trip.owner_email,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Handoff request submitted successfully. Our team will be in touch soon!',
      data: {
        id: updatedTrip.id,
        share_code: updatedTrip.share_code,
        title: updatedTrip.title,
        status: updatedTrip.status,
        handoff_requested_at: updatedTrip.handoff_requested_at,
        handoff_notes: updatedTrip.handoff_notes,
      },
    });
  }
);
