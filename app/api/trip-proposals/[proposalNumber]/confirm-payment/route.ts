import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient } from '@/lib/stripe-brands';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { tripProposalEmailService } from '@/lib/services/trip-proposal-email.service';
import { query, withTransaction } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ConfirmPaymentSchema = z.object({
  payment_intent_id: z.string({ error: 'payment_intent_id is required' }).min(1, 'payment_intent_id is required'),
});

/**
 * POST /api/trip-proposals/[proposalNumber]/confirm-payment
 * Confirm payment after Stripe redirect and mark deposit as paid.
 * Does NOT auto-convert to booking.
 */

interface RouteParams {
  proposalNumber: string;
}

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { proposalNumber } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const parseResult = ConfirmPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError(parseResult.error.issues[0]?.message || 'Invalid request');
    }
    const { payment_intent_id } = parseResult.data;

    // Look up proposal by proposal number
    const proposal = await tripProposalService.getByNumber(proposalNumber);

    if (!proposal) {
      throw new NotFoundError('Trip proposal not found');
    }

    // Idempotent: if deposit already paid, return success immediately
    if (proposal.deposit_paid === true) {
      return NextResponse.json({
        success: true,
        data: {
          already_paid: true,
          proposal_number: proposal.proposal_number,
          deposit_amount: parseFloat(String(proposal.deposit_amount)),
          deposit_paid_at: proposal.deposit_paid_at,
        },
      });
    }

    // Get brand-specific Stripe client
    const stripe = getBrandStripeClient(proposal.brand_id ?? undefined);
    if (!stripe) {
      logger.error('[Trip Proposal Payment] Stripe not configured for brand', {
        brandId: proposal.brand_id,
      });
      throw new BadRequestError('Payment service not configured. Please contact support.');
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestError(
        `Payment has not succeeded. Current status: ${paymentIntent.status}`
      );
    }

    // Verify metadata matches this proposal
    if (paymentIntent.metadata.trip_proposal_id !== proposal.id.toString()) {
      throw new BadRequestError('Payment does not match this trip proposal');
    }

    // Update proposal and create payment record in a transaction
    await withTransaction(async (client) => {
      // Mark deposit as paid and unlock planning phase
      // (AND deposit_paid = false prevents TOCTOU race)
      const updateResult = await query(
        `UPDATE trip_proposals
         SET deposit_paid = true,
             deposit_paid_at = NOW(),
             planning_phase = 'active_planning',
             updated_at = NOW()
         WHERE id = $1 AND deposit_paid = false`,
        [proposal.id],
        client
      );

      // If no rows updated, another request already processed this payment
      if (updateResult.rowCount === 0) {
        return;
      }

      // Insert payment record (wrapped in try/catch since payments table schema may vary)
      try {
        await query(
          `INSERT INTO payments (
            trip_proposal_id,
            amount,
            payment_type,
            stripe_payment_intent_id,
            status,
            created_at
          ) VALUES ($1, $2, 'trip_proposal_deposit', $3, 'succeeded', NOW())`,
          [
            proposal.id,
            paymentIntent.amount / 100,
            payment_intent_id,
          ],
          client
        );
      } catch (paymentErr) {
        // Payment table schema may not have trip_proposal_id column yet.
        // Log the error but don't fail the transaction - the deposit_paid flag
        // on the trip_proposals table is the source of truth.
        logger.warn('[Trip Proposal Payment] Could not insert payment record', {
          error: paymentErr instanceof Error ? paymentErr.message : String(paymentErr),
          note: 'Payments table may need trip_proposal_id column or different schema',
        });
      }
    });

    // Trigger deposit received email asynchronously
    after(async () => {
      try {
        logger.info('[Trip Proposal Payment] Payment confirmed', {
          proposalId: proposal.id,
          proposalNumber: proposal.proposal_number,
          paymentIntentId: payment_intent_id,
          amount: paymentIntent.amount / 100,
          brandId: proposal.brand_id,
        });

        await tripProposalEmailService.sendDepositReceivedEmail(
          proposal.id,
          paymentIntent.amount / 100
        );
      } catch (err) {
        logger.error('[Trip Proposal Payment] Failed to send deposit received email', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        proposal_number: proposal.proposal_number,
        deposit_amount: paymentIntent.amount / 100,
        deposit_paid: true,
        payment_intent_id: paymentIntent.id,
      },
    });
  }
);
