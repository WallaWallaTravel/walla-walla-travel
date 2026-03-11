import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
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
    const tripRows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM trips WHERE share_code = ${shareCode}
    `;

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripRows[0].id;

    // Get next stop order for the day
    const orderRows = await prisma.$queryRaw<{ next_order: number }[]>`
      SELECT COALESCE(MAX(stop_order), 0) + 1 as next_order
       FROM trip_stops
       WHERE trip_id = ${tripId} AND day_number = ${validated.day_number}
    `;

    const stopOrder = orderRows[0].next_order;

    // Insert the stop
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO trip_stops (
        trip_id, stop_type, name, description,
        winery_id, lodging_property_id, check_in_date, check_out_date,
        day_number, stop_order,
        planned_arrival, planned_departure, duration_minutes,
        notes, special_requests, estimated_cost_per_person,
        added_by, status
      ) VALUES (
        ${tripId}, ${validated.stop_type}, ${validated.name}, ${validated.description || null}, ${validated.winery_id || null}, ${validated.lodging_property_id || null}, ${validated.check_in_date || null}, ${validated.check_out_date || null}, ${validated.day_number}, ${stopOrder}, ${validated.planned_arrival || null}, ${validated.planned_departure || null}, ${validated.duration_minutes || null}, ${validated.notes || null}, ${validated.special_requests || null}, ${validated.estimated_cost_per_person || null}, 'owner', 'suggested'
      )
      RETURNING *
    `;

    const stop = rows[0];

    // Update trip activity timestamp
    await prisma.$executeRaw`
      UPDATE trips SET last_activity_at = NOW() WHERE id = ${tripId}
    `;

    // Log activity
    await prisma.$executeRaw`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES (${tripId}, 'stop_added', ${`Added stop: ${validated.name}`}, 'owner')
    `;

    return NextResponse.json({
      success: true,
      data: {
        id: stop.id,
        trip_id: stop.trip_id,
        stop_type: stop.stop_type,
        name: stop.name,
        description: stop.description,
        winery_id: stop.winery_id,
        lodging_property_id: stop.lodging_property_id || null,
        check_in_date: stop.check_in_date || null,
        check_out_date: stop.check_out_date || null,
        day_number: stop.day_number,
        stop_order: stop.stop_order,
        planned_arrival: stop.planned_arrival,
        planned_departure: stop.planned_departure,
        duration_minutes: stop.duration_minutes,
        status: stop.status,
        notes: stop.notes,
        special_requests: stop.special_requests,
        estimated_cost_per_person: stop.estimated_cost_per_person ? parseFloat(stop.estimated_cost_per_person as string) : null,
        added_by: stop.added_by,
        created_at: stop.created_at,
        updated_at: stop.updated_at,
      },
    }, { status: 201 });
  }
);
