/**
 * Get Reservation Details API
 * Fetch a specific reservation by ID
 *
 * @deprecated LEGACY — uses raw SQL instead of bookingService.
 * Modern equivalent: GET /api/bookings/[bookingNumber] (service-layer).
 * Still in active use by /book/reserve/confirmation — do NOT delete without migrating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      r.*,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone
    FROM reservations r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.id = ${reservationId}`;

  if (rows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  return NextResponse.json({
    success: true,
    reservation: rows[0]
  });
});
