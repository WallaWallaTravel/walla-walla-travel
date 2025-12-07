/**
 * Create Stripe Payment Intent for Reservation Deposit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDepositPaymentIntent } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, reservationId, customerEmail, customerName, partySize, preferredDate } = body;

    // Validate required fields
    if (!amount || !reservationId || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await createDepositPaymentIntent(amount, {
      reservationId,
      customerEmail,
      customerName,
      partySize,
      preferredDate,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}


