/**
 * Mark Reservation as Contacted API
 * Update reservation status after calling customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reservations/[id]/contact
 * Mark reservation as contacted
 */
export const POST = withErrorHandling(async (
  _request: NextRequest,
  context
) => {
  const { id } = await context.params;
  const reservationId = parseInt(id);

  if (isNaN(reservationId)) {
    throw new BadRequestError('Invalid reservation ID');
  }

  const result = await query(
    `UPDATE reservations
     SET status = 'contacted',
         contacted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, reservation_number`,
    [reservationId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  logger.info('Reservation marked as contacted', { reservationNumber: result.rows[0].reservation_number });

  return NextResponse.json({
    success: true,
    message: 'Reservation marked as contacted'
  });
});
