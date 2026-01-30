import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { getBrandStripeClient } from '@/lib/stripe-brands';
import { query, queryOne, withTransaction } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';
import { sendBookingConfirmationEmail } from '@/lib/services/email-automation.service';

/**
 * POST /api/proposals/[proposal_id]/confirm-payment
 * Confirm payment succeeded and convert proposal to booking
 */
export const POST = withErrorHandling<unknown, { proposal_id: string }>(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
) => {
  const { proposal_id } = await params;
  const body = await request.json();
  const { payment_intent_id } = body;

  if (!payment_intent_id) {
    throw new BadRequestError('payment_intent_id is required');
  }

  // Get proposal
  const proposal = await queryOne(
    `SELECT * FROM proposals
     WHERE proposal_number = $1 OR id::text = $1`,
    [proposal_id]
  );

  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }

  // Check if already converted
  if (proposal.converted_to_booking_id) {
    // Return existing booking info
    const booking = await queryOne(
      `SELECT booking_number, id FROM bookings WHERE id = $1`,
      [proposal.converted_to_booking_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        already_converted: true,
        booking_number: booking?.booking_number,
        booking_id: booking?.id,
      },
    });
  }

  // Get brand-specific Stripe client
  const stripe = getBrandStripeClient(proposal.brand_id);
  if (!stripe) {
    logger.error('Stripe not configured for brand', { brandId: proposal.brand_id });
    throw new BadRequestError('Payment service not configured. Please contact support.');
  }

  // Verify payment with Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

  if (paymentIntent.status !== 'succeeded') {
    throw new BadRequestError('Payment has not succeeded yet');
  }

  // Verify this payment is for this proposal
  if (paymentIntent.metadata.proposal_id !== proposal.id.toString()) {
    throw new BadRequestError('Payment does not match this proposal');
  }

  // Convert proposal to booking in a transaction
  const result = await withTransaction(async (client) => {
    // Update proposal status
    try {
      await query(
        `UPDATE proposals
         SET payment_status = 'succeeded',
             payment_amount = $1,
             payment_date = NOW(),
             status = 'converted',
             updated_at = NOW()
         WHERE id = $2`,
        [paymentIntent.amount / 100, proposal.id],
        client
      );
    } catch (dbError) {
      // Columns might not exist
      logger.warn('[Confirm Payment] Could not update payment columns', { error: dbError });
      await query(
        `UPDATE proposals
         SET status = 'converted',
             updated_at = NOW()
         WHERE id = $1`,
        [proposal.id],
        client
      );
    }

    // Generate booking number
    const year = new Date().getFullYear();
    const seqResult = await queryOne(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 10) AS INTEGER)), 0) + 1 as next_seq
       FROM bookings
       WHERE booking_number LIKE $1`,
      [`WWT-${year}-%`],
      client
    );
    const nextSeq = seqResult?.next_seq || 1;
    const bookingNumber = `WWT-${year}-${String(nextSeq).padStart(5, '0')}`;

    // Calculate amounts
    const finalTotal = proposal.final_total || proposal.total;
    const depositAmount = finalTotal * 0.5;

    // Get customer ID or create one
    let customerId: number | null = null;
    const customerEmail = proposal.accepted_by_email || proposal.client_email;
    const customerName = proposal.accepted_by_name || proposal.client_name;
    const customerPhone = proposal.accepted_by_phone || proposal.client_phone;

    if (customerEmail) {
      const existingCustomer = await queryOne(
        `SELECT id FROM customers WHERE email = $1`,
        [customerEmail],
        client
      );

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await queryOne(
          `INSERT INTO customers (name, email, phone, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id`,
          [customerName, customerEmail, customerPhone],
          client
        );
        customerId = newCustomer?.id || null;
      }
    }

    // Create booking
    const booking = await queryOne(
      `INSERT INTO bookings (
        booking_number,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        status,
        total_price,
        base_price,
        deposit_amount,
        deposit_paid,
        deposit_paid_at,
        final_payment_amount,
        final_payment_paid,
        booking_source,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, $13, NOW(), NOW())
      RETURNING id, booking_number`,
      [
        bookingNumber,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        'confirmed',
        finalTotal,
        proposal.subtotal || finalTotal,
        depositAmount,
        true, // deposit_paid
        depositAmount, // final_payment_amount
        false, // final_payment_paid
        'proposal',
      ],
      client
    );

    if (!booking) {
      throw new BadRequestError('Failed to create booking');
    }

    // Link proposal to booking
    await query(
      `UPDATE proposals
       SET converted_to_booking_id = $1,
           converted_at = NOW()
       WHERE id = $2`,
      [booking.id, proposal.id],
      client
    );

    // Create payment record
    await query(
      `INSERT INTO payments (
        booking_id,
        customer_id,
        amount,
        currency,
        payment_type,
        payment_method,
        stripe_payment_intent_id,
        status,
        created_at,
        succeeded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        booking.id,
        customerId,
        depositAmount,
        'USD',
        'deposit',
        'card',
        payment_intent_id,
        'succeeded',
      ],
      client
    );

    // Log activity
    await query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        proposal.id,
        'payment_confirmed',
        `Payment confirmed and converted to booking ${bookingNumber}`,
        JSON.stringify({
          payment_intent_id,
          amount: depositAmount,
          booking_id: booking.id,
          booking_number: bookingNumber,
          timestamp: new Date().toISOString(),
        }),
      ],
      client
    );

    return booking;
  });

  if (!result) {
    throw new BadRequestError('Failed to create booking');
  }

  // Send confirmation email (async, don't block)
  if (result.id) {
    sendBookingConfirmationEmail(result.id).catch(err => {
      logger.error('[Confirm Payment] Failed to send confirmation email', { error: err });
    });
  }

  logger.info('[Proposal Payment] Payment confirmed and booking created', {
    proposalId: proposal.id,
    proposalNumber: proposal.proposal_number,
    bookingId: result.id,
    bookingNumber: result.booking_number,
    paymentIntentId: payment_intent_id,
    brandId: proposal.brand_id,
  });

  return NextResponse.json({
    success: true,
    data: {
      booking_number: result.booking_number,
      booking_id: result.id,
      proposal_number: proposal.proposal_number,
    },
  });
});
