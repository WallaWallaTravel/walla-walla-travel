import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient, getBrandStripePublishableKey } from '@/lib/stripe-brands';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { handleStripeError } from '@/lib/stripe/error-handler';

interface RouteParams { token: string; guestToken: string; }

/**
 * POST /api/my-trip/[token]/guest/[guestToken]/create-payment
 * Create Stripe PaymentIntent for one guest's share
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { token, guestToken } = await (context as RouteContext<RouteParams>).params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) throw new NotFoundError('Trip not found');

    if (!proposal.individual_billing_enabled) {
      throw new BadRequestError('Individual billing is not enabled for this trip');
    }

    const guestRows = await prisma.$queryRaw<{
      id: number; name: string; email: string | null;
      amount_owed: string; amount_paid: string; payment_status: string; is_sponsored: boolean;
    }[]>`
      SELECT id, name, email, amount_owed, amount_paid, payment_status, is_sponsored
      FROM trip_proposal_guests
      WHERE trip_proposal_id = ${proposal.id} AND guest_access_token = ${guestToken}`;
    const guest = guestRows[0] ?? null;

    if (!guest) throw new NotFoundError('Guest not found');
    if (guest.is_sponsored) throw new BadRequestError('This guest is sponsored — no payment required');
    if (guest.payment_status === 'paid') throw new BadRequestError('Payment already completed');

    const amountOwed = parseFloat(guest.amount_owed) || 0;
    const amountPaid = parseFloat(guest.amount_paid) || 0;
    const remaining = amountOwed - amountPaid;

    if (remaining <= 0) throw new BadRequestError('No remaining balance');

    const amountInCents = Math.round(remaining * 100);
    const brandId = proposal.brand_id ?? undefined;
    const stripe = getBrandStripeClient(brandId);
    if (!stripe) throw new BadRequestError('Payment service not configured');

    const brand = getBrandEmailConfig(brandId);
    const publishableKey = getBrandStripePublishableKey(brandId);

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: 'usd',
          metadata: {
            payment_type: 'guest_share',
            trip_proposal_id: proposal.id.toString(),
            proposal_number: proposal.proposal_number,
            guest_id: guest.id.toString(),
            guest_name: guest.name,
            customer_email: guest.email || '',
            brand_id: (proposal.brand_id || 1).toString(),
          },
          description: `${brand.name} - Guest Payment for ${guest.name} (${proposal.proposal_number})`,
          receipt_email: guest.email || undefined,
          automatic_payment_methods: { enabled: true },
        },
        { idempotencyKey: `pi_guest_${guest.id}_${amountInCents}` }
      );
    } catch (stripeError) {
      const { status, message, code, retryable } = handleStripeError(stripeError, {
        proposalId: proposal.id, guestId: guest.id, amount: remaining,
      });
      return NextResponse.json(
        { error: message, code, retryable },
        { status, ...(retryable ? { headers: { 'Retry-After': '30' } } : {}) }
      );
    }

    after(async () => {
      logger.info('[Guest Payment] Payment intent created', {
        proposalId: proposal.id, guestId: guest.id, amount: remaining,
        paymentIntentId: paymentIntent.id,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        amount: remaining,
        publishable_key: publishableKey,
        payment_intent_id: paymentIntent.id,
        guest_name: guest.name,
      },
    });
  }
);
