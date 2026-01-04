import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id: bookingId } = await params;
    const { stops } = await request.json();

    // Get itinerary ID for this booking
    const itineraryResult = await query(
      'SELECT id FROM itineraries WHERE booking_id = $1',
      [bookingId]
    );

    if (itineraryResult.rows.length === 0) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
    }

    const itineraryId = itineraryResult.rows[0].id;

    // Update stop orders in a transaction
    await query('BEGIN');

    for (const stop of stops) {
      await query(`
        UPDATE itinerary_stops
        SET stop_order = $1
        WHERE id = $2 AND itinerary_id = $3
      `, [stop.stop_order, stop.id, itineraryId]);
    }

    await query('COMMIT');

    return NextResponse.json({ success: true, message: 'Stops reordered successfully' });
  } catch (error) {
    await query('ROLLBACK');
    logger.error('Error reordering stops', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
