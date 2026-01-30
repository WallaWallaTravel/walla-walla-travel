import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { booking_id, driver_id } = await request.json();

  if (!booking_id) {
    throw new BadRequestError('Missing booking_id');
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
});
