import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient, getBrandStripePublishableKey } from '@/lib/stripe-brands';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { query, queryOne } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/proposals/[proposal_id]/create-payment
 * Create a Stripe PaymentIntent for a proposal deposit
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
) => {
  const { proposal_id } = await params;

  // Get proposal by ID or proposal_number
  const proposal = await queryOne(
    `SELECT * FROM proposals
     WHERE proposal_number = $1 OR id::text = $1`,
    [proposal_id]
  );

  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }

  // Check if proposal is accepted
  if (proposal.status !== 'accepted') {
    throw new BadRequestError('This proposal must be accepted before payment');
  }

  // Get brand-specific Stripe client
  const stripe = getBrandStripeClient(proposal.brand_id);
  if (!stripe) {
    logger.error('Stripe not configured for brand', { brandId: proposal.brand_id });
    throw new BadRequestError('Payment service not configured. Please contact support.');
  }

  const brand = getBrandEmailConfig(proposal.brand_id);

  // Get publishable key for client-side Stripe
  const publishableKey = getBrandStripePublishableKey(proposal.brand_id);

  // Check if payment already exists
  if (proposal.payment_intent_id) {
    // Return existing payment intent
    try {
      const existingIntent = await stripe.paymentIntents.retrieve(proposal.payment_intent_id);
      if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
        return NextResponse.json({
          success: true,
          data: {
            client_secret: existingIntent.client_secret,
            amount: existingIntent.amount / 100,
            payment_intent_id: existingIntent.id,
            publishable_key: publishableKey,
            existing: true,
          },
        });
      }
    } catch (err) {
      // Payment intent might be invalid, create a new one
      logger.warn('[Proposal Payment] Failed to retrieve existing payment intent', { error: err });
    }
  }

  // Calculate deposit amount (50% of final total)
  const finalTotal = proposal.final_total || proposal.total;
  const depositAmount = Math.round(finalTotal * 0.5 * 100); // Convert to cents

  if (depositAmount <= 0) {
    throw new BadRequestError('Invalid proposal total');
  }

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: depositAmount,
    currency: 'usd',
    metadata: {
      proposal_id: proposal.id.toString(),
      proposal_number: proposal.proposal_number,
      brand_id: (proposal.brand_id || 1).toString(),
      client_name: proposal.client_name || proposal.accepted_by_name || '',
      client_email: proposal.client_email || proposal.accepted_by_email || '',
      payment_type: 'proposal_deposit',
    },
    description: `${brand.name} - Deposit for ${proposal.title || proposal.proposal_number}`,
    receipt_email: proposal.accepted_by_email || proposal.client_email || undefined,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Store payment intent ID on proposal (if columns exist)
  try {
    await query(
      `UPDATE proposals
       SET payment_intent_id = $1,
           payment_status = 'pending',
           updated_at = NOW()
       WHERE id = $2`,
      [paymentIntent.id, proposal.id]
    );
  } catch (dbError) {
    // Columns might not exist yet - log and continue
    logger.warn('[Proposal Payment] Could not update proposal with payment_intent_id', {
      error: dbError,
      note: 'Run scripts/add-proposal-payment-columns.sql to add payment columns',
    });
  }

  // Log activity
  await query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      proposal.id,
      'payment_initiated',
      'Payment process initiated',
      JSON.stringify({
        payment_intent_id: paymentIntent.id,
        amount: depositAmount / 100,
        timestamp: new Date().toISOString(),
      }),
    ]
  );

  logger.info('[Proposal Payment] Payment intent created', {
    proposalId: proposal.id,
    proposalNumber: proposal.proposal_number,
    paymentIntentId: paymentIntent.id,
    amount: depositAmount / 100,
    brandId: proposal.brand_id,
    brandName: brand.name,
  });

  return NextResponse.json({
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      amount: depositAmount / 100,
      payment_intent_id: paymentIntent.id,
      publishable_key: publishableKey,
    },
  });
});
