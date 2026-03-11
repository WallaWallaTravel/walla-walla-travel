/**
 * Create Stripe Payment Intent for Reservation Deposit
 *
 * @deprecated LEGACY — part of the Reserve & Refine flow.
 * Modern equivalent: POST /api/bookings/create handles payment inline.
 * Still in active use by /book/reserve/payment — do NOT delete without migrating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDepositPaymentIntent } from '@/lib/stripe';
import { withErrorHandling } from '@/lib/api-errors';
import { validateBody, ReservationPaymentIntentSchema } from '@/lib/api/middleware/validation';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

export const POST = withRateLimit(rateLimiters.payment)(
    withErrorHandling(async (request: NextRequest) => {
  // Validate input with Zod schema
  const { amount, reservationId, customerEmail, customerName, partySize, preferredDate } =
    await validateBody(request, ReservationPaymentIntentSchema);

  // Create payment intent
  const paymentIntent = await createDepositPaymentIntent(amount, {
    reservationId,
    customerEmail,
    customerName,
    partySize: partySize ?? 1,
    preferredDate: preferredDate ?? new Date().toISOString().split('T')[0],
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}));


