/**
 * Get Reservation Details API
 * Fetch a specific reservation by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/reserve/[id]
 * Get reservation details
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  context
) => {
  const { id } = await context.params;
  const reservationId = parseInt(id);

  if (isNaN(reservationId)) {
    throw new BadRequestError('Invalid reservation ID');
  }

  const result = await query(
    `SELECT
      r.*,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone
     FROM reservations r
     JOIN customers c ON r.customer_id = c.id
     WHERE r.id = $1`,
    [reservationId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  return NextResponse.json({
    success: true,
    reservation: result.rows[0]
  });
});
