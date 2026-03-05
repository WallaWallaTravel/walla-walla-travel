/**
 * Trip Proposal Payment Service
 *
 * P2-9: Shared confirm-payment logic extracted from two near-identical route handlers:
 *   - POST /api/trip-proposals/[proposalNumber]/confirm-payment
 *   - POST /api/my-trip/[token]/confirm-payment
 *
 * Both routes verify a Stripe PaymentIntent, mark the deposit as paid,
 * insert a payment record, and send the deposit-received email.
 * This service centralises that logic so each route is a thin wrapper.
 *
 * @module lib/services/trip-proposal-payment.service
 */

import { after } from 'next/server';
import { getBrandStripeClient } from '@/lib/stripe-brands';
import { tripProposalEmailService } from '@/lib/services/trip-proposal-email.service';
import { query, withTransaction } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import type { TripProposal } from '@/lib/types/trip-proposal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmDepositResult {
  /** Already paid before this call */
  already_paid: boolean;
  proposal_number: string;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_at?: string | null;
  payment_intent_id?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Confirm a Stripe PaymentIntent and mark the trip proposal deposit as paid.
 *
 * @param proposal - The proposal record (looked up by the caller via proposal number or access token)
 * @param paymentIntentId - The Stripe payment_intent ID from the return URL
 * @param logPrefix - Log prefix for identifying which route called this (e.g. '[Trip Proposal Payment]')
 * @returns ConfirmDepositResult with deposit information
 * @throws BadRequestError / Error when payment verification fails
 */
export async function confirmTripProposalDeposit(
  proposal: TripProposal,
  paymentIntentId: string,
  logPrefix: string
): Promise<ConfirmDepositResult> {
  // Idempotent: if deposit already paid, return success immediately
  if (proposal.deposit_paid === true) {
    return {
      already_paid: true,
      proposal_number: proposal.proposal_number,
      deposit_amount: parseFloat(String(proposal.deposit_amount)),
      deposit_paid: true,
      deposit_paid_at: proposal.deposit_paid_at,
    };
  }

  // Get brand-specific Stripe client
  const stripe = getBrandStripeClient(proposal.brand_id ?? undefined);
  if (!stripe) {
    logger.error(`${logPrefix} Stripe not configured for brand`, {
      brandId: proposal.brand_id,
    });
    throw new Error('Payment service not configured. Please contact support.');
  }

  // Verify payment with Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(
      `Payment has not succeeded. Current status: ${paymentIntent.status}`
    );
  }

  // Verify metadata matches this proposal
  if (paymentIntent.metadata.trip_proposal_id !== proposal.id.toString()) {
    throw new Error('Payment does not match this trip proposal');
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

    // Insert payment record and link it back to the proposal
    const paymentInsert = await query(
      `INSERT INTO payments (
        trip_proposal_id,
        amount,
        payment_type,
        stripe_payment_intent_id,
        status,
        created_at
      ) VALUES ($1, $2, 'trip_proposal_deposit', $3, 'succeeded', NOW())
      RETURNING id`,
      [
        proposal.id,
        paymentIntent.amount / 100,
        paymentIntentId,
      ],
      client
    );

    // Set deposit_payment_id FK on the proposal so the payment record is
    // reachable directly from the proposal (avoids reverse-join queries)
    if (paymentInsert.rows.length > 0) {
      const paymentId = paymentInsert.rows[0].id;
      await query(
        `UPDATE trip_proposals SET deposit_payment_id = $1 WHERE id = $2`,
        [paymentId, proposal.id],
        client
      );
    }
  });

  // Trigger deposit received email asynchronously (non-blocking)
  after(async () => {
    try {
      logger.info(`${logPrefix} Payment confirmed`, {
        proposalId: proposal.id,
        proposalNumber: proposal.proposal_number,
        paymentIntentId,
        amount: paymentIntent.amount / 100,
        brandId: proposal.brand_id,
      });

      await tripProposalEmailService.sendDepositReceivedEmail(
        proposal.id,
        paymentIntent.amount / 100
      );
    } catch (err) {
      logger.error(`${logPrefix} Failed to send deposit received email`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return {
    already_paid: false,
    proposal_number: proposal.proposal_number,
    deposit_amount: paymentIntent.amount / 100,
    deposit_paid: true,
    payment_intent_id: paymentIntent.id,
  };
}

// Re-export the service function as part of a named service object for consistency
export const tripProposalPaymentService = {
  confirmDeposit: confirmTripProposalDeposit,
};
