/**
 * GET /api/reservations/[id]
 * Fetch reservation details by ID (public, customer-facing).
 *
 * Modern replacement for GET /api/booking/reserve/[id].
 * Uses ReservationService instead of raw SQL.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  BadRequestError,
  type RouteContext,
} from '@/lib/api/middleware/error-handler';
import { reservationService } from '@/lib/services/reservation.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandling<unknown, { id: string }>(
  async (
    _request: NextRequest,
    context: RouteContext<{ id: string }>
  ): Promise<NextResponse> => {
    const { id } = await context.params;
    const reservationId = parseInt(id, 10);

    if (isNaN(reservationId)) {
      throw new BadRequestError('Invalid reservation ID');
    }

    const reservation = await reservationService.getById(reservationId);

    return NextResponse.json({
      success: true,
      reservation,
    });
  }
);
