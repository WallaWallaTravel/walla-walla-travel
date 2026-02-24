import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient } from '@/lib/stripe-brands';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { query, queryOne, withTransaction } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface RouteParams { token: string; guestToken: string; }

const ConfirmSchema = z.object({
  payment_intent_id: z.string().min(1),
});

/**
 * POST /api/my-trip/[token]/guest/[guestToken]/confirm-payment
 * Confirm payment, record in guest_payments, update amount_paid
 *
 * B4 FIX: Idempotency is now handled atomically inside the transaction
 * using INSERT ... ON CONFLICT ... DO NOTHING + checking RETURNING.
 * The standalone SELECT before the transaction has been removed.
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { token, guestToken } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const { payment_intent_id } = ConfirmSchema.parse(body);

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) throw new NotFoundError('Trip not found');

    const guest = await queryOne<{
      id: number; name: string; amount_owed: string; amount_paid: string; payment_status: string;
    }>(
      `SELECT id, name, amount_owed, amount_paid, payment_status
       FROM trip_proposal_guests
       WHERE trip_proposal_id = $1 AND guest_access_token = $2`,
      [proposal.id, guestToken]
    );

    if (!guest) throw new NotFoundError('Guest not found');

    // Verify with Stripe
    const stripe = getBrandStripeClient(proposal.brand_id ?? undefined);
    if (!stripe) throw new BadRequestError('Payment service not configured');

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestError(`Payment not yet confirmed (status: ${paymentIntent.status})`);
    }

    const amount = paymentIntent.amount / 100;

    // B4 FIX: Atomic idempotency inside the transaction.
    // INSERT ... ON CONFLICT DO NOTHING + check if row was actually inserted.
    // If the UNIQUE index on stripe_payment_intent_id blocks it, the insert
    // returns no rows, meaning this payment was already processed.
    let alreadyProcessed = false;

    await withTransaction(async (client) => {
      // Atomic idempotency gate — relies on UNIQUE index from migration 093
      const insertResult = await query(
        `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, stripe_payment_intent_id, payment_type, status)
         VALUES ($1, $2, $3, $4, 'guest_share', 'succeeded')
         ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [proposal.id, guest.id, amount, payment_intent_id],
        client
      );

      if (insertResult.rows.length === 0) {
        // Payment was already recorded — no further updates needed
        alreadyProcessed = true;
        return;
      }

      // Update guest amount_paid and status
      const newPaid = (parseFloat(guest.amount_paid) || 0) + amount;
      const owed = parseFloat(guest.amount_owed) || 0;
      const status = newPaid >= owed ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

      await query(
        `UPDATE trip_proposal_guests
         SET amount_paid = $1, payment_status = $2,
             payment_paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE payment_paid_at END,
             updated_at = NOW()
         WHERE id = $3 AND trip_proposal_id = $4`,
        [newPaid, status, guest.id, proposal.id],
        client
      );
    });

    if (alreadyProcessed) {
      return NextResponse.json({
        success: true,
        data: { already_processed: true, guest_name: guest.name },
      });
    }

    after(async () => {
      logger.info('[Guest Payment] Payment confirmed', {
        proposalId: proposal.id, guestId: guest.id, amount,
        paymentIntentId: payment_intent_id,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        guest_name: guest.name,
        amount_paid: amount,
        payment_intent_id,
      },
    });
  }
);
