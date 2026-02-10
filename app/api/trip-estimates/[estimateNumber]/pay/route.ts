/**
 * Trip Estimate Deposit Payment API Route
 * POST /api/trip-estimates/[estimateNumber]/pay - Create Stripe payment intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { tripEstimateService } from '@/lib/services/trip-estimate.service';
import { getBrandStripeClient, getBrandStripePublishableKey } from '@/lib/stripe-brands';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ estimateNumber: string }>;
}

const PaymentRequestSchema = z.object({
  customer_email: z.string().email().optional(),
  customer_name: z.string().min(1).optional(),
});

/**
 * POST /api/trip-estimates/[estimateNumber]/pay
 * Create a Stripe payment intent for the deposit amount
 */
export async function POST(request: NextRequest, context: RouteParams) {
  const { estimateNumber } = await context.params;

  if (!estimateNumber || !estimateNumber.startsWith('TE-')) {
    return NextResponse.json(
      { success: false, error: 'Invalid estimate number' },
      { status: 400 }
    );
  }

  const estimate = await tripEstimateService.getByNumber(estimateNumber);

  if (!estimate) {
    return NextResponse.json(
      { success: false, error: 'Estimate not found' },
      { status: 404 }
    );
  }

  // Only allow payment for sent/viewed estimates
  if (!['sent', 'viewed'].includes(estimate.status)) {
    if (estimate.status === 'deposit_paid') {
      return NextResponse.json(
        { success: false, error: 'Deposit has already been paid' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Estimate not available for payment' },
      { status: 400 }
    );
  }

  if (!estimate.deposit_amount || estimate.deposit_amount <= 0) {
    return NextResponse.json(
      { success: false, error: 'No deposit amount set on this estimate' },
      { status: 400 }
    );
  }

  // Parse optional body
  const body = await request.json().catch(() => ({}));
  const parsed = PaymentRequestSchema.safeParse(body);
  const customerEmail = parsed.success ? parsed.data.customer_email : undefined;
  const customerName = parsed.success ? parsed.data.customer_name : undefined;

  // Get brand-specific Stripe client (falls back to default/NW Touring if no brand)
  const stripe = getBrandStripeClient(estimate.brand_id ?? undefined);
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Payment service not configured' },
      { status: 503 }
    );
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(estimate.deposit_amount * 100), // Convert to cents
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      type: 'trip_estimate_deposit',
      estimate_number: estimate.estimate_number,
      estimate_id: String(estimate.id),
      customer_name: customerName || estimate.customer_name,
      party_size: String(estimate.party_size),
      trip_type: estimate.trip_type,
    },
    description: `Deposit for ${estimate.trip_title || estimate.trip_type} — ${estimate.customer_name}`,
    receipt_email: customerEmail || estimate.customer_email || undefined,
  });

  return NextResponse.json({
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: estimate.deposit_amount,
      publishable_key: getBrandStripePublishableKey(estimate.brand_id ?? undefined),
    },
  });
}
