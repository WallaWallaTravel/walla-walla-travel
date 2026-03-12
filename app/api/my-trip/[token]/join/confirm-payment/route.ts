/**
 * Registration Deposit Confirmation API
 * POST /api/my-trip/[token]/join/confirm-payment
 *
 * Confirms a Stripe PaymentIntent for a registration deposit.
 * Records payment in guest_payments, updates guest payment_status,
 * and sends confirmation email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient } from '@/lib/stripe-brands';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';

interface RouteParams {
  token: string;
}

const ConfirmPaymentSchema = z.object({
  payment_intent_id: z.string().min(1, 'payment_intent_id is required'),
  guest_access_token: z.string().min(1, 'guest_access_token is required'),
});

export const POST = withCSRF(
  withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { token } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const parseResult = ConfirmPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError(parseResult.error.issues[0]?.message || 'Invalid request');
    }
    const { payment_intent_id, guest_access_token } = parseResult.data;

    // Look up proposal by access token
    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    // Look up guest by guest_access_token
    const guestRows = await prisma.$queryRawUnsafe<{
      id: number; name: string; email: string | null; payment_status: string;
    }[]>(
      `SELECT id, name, email, payment_status
       FROM trip_proposal_guests
       WHERE trip_proposal_id = $1 AND guest_access_token = $2`,
      proposal.id, guest_access_token
    );
    const guest = guestRows[0];

    if (!guest) {
      throw new NotFoundError('Guest not found');
    }

    // Get brand-specific Stripe client
    const stripe = getBrandStripeClient(proposal.brand_id ?? undefined);
    if (!stripe) {
      logger.error('[Registration Payment] Stripe not configured for brand', {
        brandId: proposal.brand_id,
      });
      throw new BadRequestError('Payment service not configured');
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestError(
        `Payment has not succeeded. Current status: ${paymentIntent.status}`
      );
    }

    // Verify metadata matches
    if (paymentIntent.metadata.payment_type !== 'registration_deposit') {
      throw new BadRequestError('Payment type mismatch');
    }
    if (paymentIntent.metadata.trip_proposal_id !== proposal.id.toString()) {
      throw new BadRequestError('Payment does not match this trip');
    }

    const amount = paymentIntent.amount / 100;

    // Atomic idempotency: INSERT ... ON CONFLICT DO NOTHING
    let alreadyProcessed = false;

    await prisma.$transaction(async (tx) => {
      const insertResult = await tx.$queryRawUnsafe<{ id: number }[]>(
        `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status)
         VALUES ($1, $2, $3, $4, 'registration_deposit', 'succeeded')
         ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        proposal.id, guest.id, amount, payment_intent_id
      );

      if (insertResult.length === 0) {
        alreadyProcessed = true;
        return;
      }

      // Update guest payment status
      await tx.$executeRawUnsafe(
        `UPDATE trip_proposal_guests
         SET payment_status = 'paid',
             amount_paid = COALESCE(amount_paid, 0) + $1,
             payment_paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $2 AND trip_proposal_id = $3`,
        amount, guest.id, proposal.id
      );
    });

    if (alreadyProcessed) {
      return NextResponse.json({
        success: true,
        data: {
          already_processed: true,
          guest_name: guest.name,
          portal_url: `/my-trip/${token}?guest=${guest_access_token}`,
        },
      });
    }

    // Send confirmation email asynchronously
    after(async () => {
      try {
        const { tripProposalEmailService } = await import('@/lib/services/trip-proposal-email.service');
        await tripProposalEmailService.sendRegistrationConfirmationEmail(
          proposal.id,
          guest.id,
          amount
        );
      } catch (err) {
        logger.error('[Registration Payment] Failed to send confirmation email', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        guest_name: guest.name,
        amount_paid: amount,
        payment_intent_id: paymentIntent.id,
        portal_url: `/my-trip/${token}?guest=${guest_access_token}`,
      },
    });
  }
)
);
