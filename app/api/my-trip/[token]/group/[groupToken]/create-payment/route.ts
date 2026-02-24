import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient, getBrandStripePublishableKey } from '@/lib/stripe-brands';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { queryOne, queryMany } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface RouteParams { token: string; groupToken: string; }

const GroupPaySchema = z.object({
  guest_ids: z.array(z.number().int().positive()).min(1),
});

/**
 * POST /api/my-trip/[token]/group/[groupToken]/create-payment
 * Group payment — pay for one or multiple members in the group
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context) => {
    const { token, groupToken } = await (context as RouteContext<RouteParams>).params;
    const body = await request.json();
    const { guest_ids } = GroupPaySchema.parse(body);

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) throw new NotFoundError('Trip not found');

    // Verify group exists
    const group = await queryOne<{ id: string; trip_proposal_id: number; group_name: string }>(
      'SELECT id, trip_proposal_id, group_name FROM guest_payment_groups WHERE group_access_token = $1',
      [groupToken]
    );
    if (!group || group.trip_proposal_id !== proposal.id) {
      throw new NotFoundError('Payment group not found');
    }

    // Get the guests being paid for
    const guests = await queryMany<{
      id: number; name: string; email: string | null;
      amount_owed: string; amount_paid: string; payment_status: string;
    }>(
      `SELECT id, name, email, amount_owed, amount_paid, payment_status
       FROM trip_proposal_guests
       WHERE id = ANY($1) AND payment_group_id = $2 AND payment_status != 'paid'`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [guest_ids as any, group.id]
    );

    if (guests.length === 0) {
      throw new BadRequestError('All selected guests are already paid');
    }

    // Calculate total for selected guests
    let totalAmount = 0;
    for (const guest of guests) {
      const remaining = (parseFloat(guest.amount_owed) || 0) - (parseFloat(guest.amount_paid) || 0);
      totalAmount += Math.max(0, remaining);
    }

    if (totalAmount <= 0) throw new BadRequestError('No remaining balance');

    const amountInCents = Math.round(totalAmount * 100);
    const brandId = proposal.brand_id ?? undefined;
    const stripe = getBrandStripeClient(brandId);
    if (!stripe) throw new BadRequestError('Payment service not configured');

    const brand = getBrandEmailConfig(brandId);
    const publishableKey = getBrandStripePublishableKey(brandId);

    const guestNames = guests.map(g => g.name).join(', ');

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          payment_type: 'group_payment',
          trip_proposal_id: proposal.id.toString(),
          proposal_number: proposal.proposal_number,
          group_id: group.id,
          group_name: group.group_name,
          guest_ids: guest_ids.join(','),
          brand_id: (proposal.brand_id || 1).toString(),
        },
        description: `${brand.name} - Group Payment for ${guestNames} (${proposal.proposal_number})`,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: `pi_group_${group.id}_${guest_ids.sort().join('_')}_${amountInCents}` }
    );

    after(async () => {
      logger.info('[Group Payment] Payment intent created', {
        proposalId: proposal.id, groupId: group.id, guestIds: guest_ids,
        amount: totalAmount, paymentIntentId: paymentIntent.id,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        amount: totalAmount,
        publishable_key: publishableKey,
        payment_intent_id: paymentIntent.id,
        guests: guests.map(g => ({ id: g.id, name: g.name })),
      },
    });
  }
);
