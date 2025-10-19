import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * PUT /api/itineraries/[id]
 *
 * Update an existing itinerary
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itineraryId = params.id;
    const body = await request.json();
    const {
      template_name,
      is_template,
      pickup_location,
      pickup_time,
      dropoff_location,
      estimated_dropoff_time,
      internal_notes,
      driver_notes
    } = body;

    // Verify itinerary exists
    const existingResult = await query(
      `SELECT * FROM itineraries WHERE id = $1`,
      [itineraryId]
    );

    if (existingResult.rows.length === 0) {
      return errorResponse('Itinerary not found', 404);
    }

    const existing = existingResult.rows[0];

    // Update itinerary
    const updateResult = await query(
      `UPDATE itineraries SET
        template_name = COALESCE($1, template_name),
        is_template = COALESCE($2, is_template),
        pickup_location = COALESCE($3, pickup_location),
        pickup_time = COALESCE($4, pickup_time),
        dropoff_location = COALESCE($5, dropoff_location),
        estimated_dropoff_time = COALESCE($6, estimated_dropoff_time),
        internal_notes = COALESCE($7, internal_notes),
        driver_notes = COALESCE($8, driver_notes),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *`,
      [
        template_name,
        is_template,
        pickup_location,
        pickup_time,
        dropoff_location,
        estimated_dropoff_time,
        internal_notes,
        driver_notes,
        itineraryId
      ]
    );

    const updated = updateResult.rows[0];

    // Get all stops
    const stopsResult = await query(
      `SELECT s.*, w.name as winery_name
       FROM itinerary_stops s
       JOIN wineries w ON s.winery_id = w.id
       WHERE s.itinerary_id = $1
       ORDER BY s.stop_order ASC`,
      [itineraryId]
    );

    // Create timeline event
    await query(
      `INSERT INTO booking_timeline (
        booking_id,
        event_type,
        event_description,
        event_data,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [
        existing.booking_id,
        'itinerary_updated',
        'Itinerary updated',
        JSON.stringify({
          itinerary_id: itineraryId,
          changes: {
            template_name,
            pickup_location,
            pickup_time
          }
        })
      ]
    );

    return successResponse(
      {
        itinerary: {
          ...updated,
          stops: stopsResult.rows
        }
      },
      'Itinerary updated successfully'
    );

  } catch (error: any) {
    console.error('❌ Update itinerary error:', error);
    return errorResponse('Failed to update itinerary', 500);
  }
}

/**
 * DELETE /api/itineraries/[id]
 *
 * Delete an itinerary (cascade deletes stops)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itineraryId = params.id;

    // Verify itinerary exists
    const existingResult = await query(
      `SELECT * FROM itineraries WHERE id = $1`,
      [itineraryId]
    );

    if (existingResult.rows.length === 0) {
      return errorResponse('Itinerary not found', 404);
    }

    const existing = existingResult.rows[0];

    // Delete itinerary (stops cascade delete)
    await query(
      `DELETE FROM itineraries WHERE id = $1`,
      [itineraryId]
    );

    // Create timeline event
    await query(
      `INSERT INTO booking_timeline (
        booking_id,
        event_type,
        event_description,
        created_at
      ) VALUES ($1, $2, $3, NOW())`,
      [
        existing.booking_id,
        'itinerary_deleted',
        'Itinerary removed from booking'
      ]
    );

    return successResponse(
      { deleted: true },
      'Itinerary deleted successfully'
    );

  } catch (error: any) {
    console.error('❌ Delete itinerary error:', error);
    return errorResponse('Failed to delete itinerary', 500);
  }
}
