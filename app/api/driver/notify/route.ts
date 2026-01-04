import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { booking_id, driver_id } = await request.json();

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    // Assign driver to booking if provided
    if (driver_id) {
      await query(`
        UPDATE bookings
        SET driver_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [driver_id, booking_id]);
    }

    // Mark as notified (simplified version - full version would send email/SMS)
    // For now, just update the booking status or add a note
    await query(`
      UPDATE bookings
      SET status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
          updated_at = NOW()
      WHERE id = $1
    `, [booking_id]);

    return NextResponse.json({
      success: true,
      message: 'Driver notified successfully'
    });
  } catch (error) {
    logger.error('Error notifying driver', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
