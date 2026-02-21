import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient, getBrandStripePublishableKey } from '@/lib/stripe-brands';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { logger } from '@/lib/logger';

/**
 * POST /api/trip-proposals/[proposalNumber]/create-payment
 * Create a Stripe PaymentIntent for a trip proposal deposit
 */

interface RouteParams {
  proposalNumber: string;
}

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { proposalNumber } = await (context as RouteContext<RouteParams>).params;

    // Look up proposal by proposal number
    const proposal = await tripProposalService.getByNumber(proposalNumber);

    if (!proposal) {
      throw new NotFoundError('Trip proposal not found');
    }

    // Validate: must be accepted and deposit not yet paid
    if (proposal.status !== 'accepted') {
      throw new BadRequestError('This trip proposal must be accepted before payment');
    }

    if (proposal.deposit_paid) {
      throw new BadRequestError('Deposit has already been paid for this trip proposal');
    }

    const brandId = proposal.brand_id ?? undefined;

    // Get brand-specific Stripe client
    const stripe = getBrandStripeClient(brandId);
    if (!stripe) {
      logger.error('[Trip Proposal Payment] Stripe not configured for brand', {
        brandId: proposal.brand_id,
      });
      throw new BadRequestError('Payment service not configured. Please contact support.');
    }

    const brand = getBrandEmailConfig(brandId);

    // Get publishable key for client-side Stripe
    const publishableKey = getBrandStripePublishableKey(brandId);

    // Convert deposit_amount (already calculated on the proposal) to cents
    const depositStr = typeof proposal.deposit_amount === 'number'
      ? String(proposal.deposit_amount)
      : proposal.deposit_amount;
    const amountInCents = Math.round(parseFloat(depositStr) * 100);

    if (amountInCents <= 0) {
      throw new BadRequestError('Invalid deposit amount. Please ensure pricing has been calculated.');
    }

    // Create Stripe PaymentIntent with idempotency key
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          payment_type: 'trip_proposal_deposit',
          trip_proposal_id: proposal.id.toString(),
          proposal_number: proposal.proposal_number,
          customer_email: proposal.customer_email || '',
          brand_id: (proposal.brand_id || 1).toString(),
        },
        description: `${brand.name} - Trip Proposal Deposit for ${proposal.trip_title || proposal.proposal_number}`,
        receipt_email: proposal.customer_email || undefined,
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey: `pi_tp_${proposal.id}_${amountInCents}`,
      }
    );

    // Log activity asynchronously (don't block the response)
    after(async () => {
      try {
        logger.info('[Trip Proposal Payment] Payment intent created', {
          proposalId: proposal.id,
          proposalNumber: proposal.proposal_number,
          paymentIntentId: paymentIntent.id,
          amount: amountInCents / 100,
          brandId: proposal.brand_id,
          brandName: brand.name,
        });
      } catch (err) {
        logger.warn('[Trip Proposal Payment] Failed to log activity', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        amount: amountInCents / 100,
        publishable_key: publishableKey,
        payment_intent_id: paymentIntent.id,
      },
    });
  }
);
