/**
 * POST /api/reservations/[id]/confirm-payment
 * Confirm Stripe payment for a reservation deposit.
 *
 * Modern replacement for POST /api/booking/reserve/confirm-payment.
 * Uses ReservationService instead of raw SQL.
 * Side effects: updates DB, sends confirmation email, logs to CRM.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  BadRequestError,
  type RouteContext,
} from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { validateBody, ConfirmReservationPaymentSchema } from '@/lib/api/middleware/validation';
import { reservationService } from '@/lib/services/reservation.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withErrorHandling<unknown, { id: string }>(
      async (
        request: NextRequest,
        context: RouteContext<{ id: string }>
      ): Promise<NextResponse> => {
        const { id } = await context.params;
        const reservationId = parseInt(id, 10);

        if (isNaN(reservationId)) {
          throw new BadRequestError('Invalid reservation ID');
        }

        const { paymentIntentId } = await validateBody(
          request,
          ConfirmReservationPaymentSchema
        );

        const result = await reservationService.confirmPayment(
          reservationId,
          paymentIntentId
        );

        return NextResponse.json({
          success: true,
          reservationId: result.reservationId,
          reservationNumber: result.reservationNumber,
        });
      }
    )
  )
);
