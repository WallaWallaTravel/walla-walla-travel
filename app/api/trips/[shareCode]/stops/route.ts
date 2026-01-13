import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { addStopSchema } from '@/lib/validation/schemas/trip';

interface RouteParams {
  shareCode: string;
}

// ============================================================================
// POST /api/trips/[shareCode]/stops - Add a stop to the trip
// ============================================================================

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    const body = await request.json();
    const validated = addStopSchema.parse(body);

    // Get trip ID from share code
    const tripResult = await query(
      `SELECT id FROM trips WHERE share_code = $1`,
      [shareCode]
    );

    if (tripResult.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripResult.rows[0].id;

    // Get next stop order for the day
    const orderResult = await query(
      `SELECT COALESCE(MAX(stop_order), 0) + 1 as next_order
       FROM trip_stops
       WHERE trip_id = $1 AND day_number = $2`,
      [tripId, validated.day_number]
    );

    const stopOrder = orderResult.rows[0].next_order;

    // Insert the stop
    const result = await query(
      `INSERT INTO trip_stops (
        trip_id, stop_type, name, description,
        winery_id, day_number, stop_order,
        planned_arrival, planned_departure, duration_minutes,
        notes, special_requests, estimated_cost_per_person,
        added_by, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'suggested'
      )
      RETURNING *`,
      [
        tripId,
        validated.stop_type,
        validated.name,
        validated.description || null,
        validated.winery_id || null,
        validated.day_number,
        stopOrder,
        validated.planned_arrival || null,
        validated.planned_departure || null,
        validated.duration_minutes || null,
        validated.notes || null,
        validated.special_requests || null,
        validated.estimated_cost_per_person || null,
        'owner', // added_by
      ]
    );

    const stop = result.rows[0];

    // Update trip activity timestamp
    await query(
      `UPDATE trips SET last_activity_at = NOW() WHERE id = $1`,
      [tripId]
    );

    // Log activity
    await query(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES ($1, 'stop_added', $2, 'owner')`,
      [tripId, `Added stop: ${validated.name}`]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: stop.id,
        trip_id: stop.trip_id,
        stop_type: stop.stop_type,
        name: stop.name,
        description: stop.description,
        winery_id: stop.winery_id,
        day_number: stop.day_number,
        stop_order: stop.stop_order,
        planned_arrival: stop.planned_arrival,
        planned_departure: stop.planned_departure,
        duration_minutes: stop.duration_minutes,
        status: stop.status,
        notes: stop.notes,
        special_requests: stop.special_requests,
        estimated_cost_per_person: stop.estimated_cost_per_person ? parseFloat(stop.estimated_cost_per_person) : null,
        added_by: stop.added_by,
        created_at: stop.created_at,
        updated_at: stop.updated_at,
      },
    }, { status: 201 });
  }
);
