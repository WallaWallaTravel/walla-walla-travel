import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getBrandStripeClient } from '@/lib/stripe-brands';

interface RouteParams {
  params: Promise<{ tour_id: string }>;
}

interface DiscountRequest {
  discount_type: 'flat' | 'percentage';
  discount_amount: number;
  reason?: string;
  confirmed?: boolean;
}

interface TicketRefundPreview {
  ticket_id: string;
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  ticket_count: number;
  includes_lunch: boolean;
  original_paid: number;
  new_price: number;
  refund_amount: number;
  stripe_payment_intent_id: string | null;
}

interface DiscountPreview {
  original_base_price: number;
  new_base_price: number;
  original_lunch_price: number;
  new_lunch_price: number;
  tickets_affected: TicketRefundPreview[];
  total_refund: number;
  can_apply: boolean;
  warnings: string[];
}

/**
 * POST /api/admin/shared-tours/[tour_id]/discount
 * Preview discount application - calculates refunds without applying
 *
 * Also handles confirmation when `confirmed: true` is passed
 */
export const POST = withAdminAuth(async (request: NextRequest, session: AuthSession, context) => {
  const { tour_id } = await (context as RouteParams).params;
  const body: DiscountRequest = await request.json();

  // Validate request
  if (!body.discount_type || !['flat', 'percentage'].includes(body.discount_type)) {
    return NextResponse.json(
      { success: false, error: 'Invalid discount_type. Must be "flat" or "percentage"' },
      { status: 400 }
    );
  }

  if (typeof body.discount_amount !== 'number' || body.discount_amount <= 0) {
    return NextResponse.json(
      { success: false, error: 'discount_amount must be a positive number' },
      { status: 400 }
    );
  }

  if (body.discount_type === 'percentage' && body.discount_amount > 100) {
    return NextResponse.json(
      { success: false, error: 'Percentage discount cannot exceed 100%' },
      { status: 400 }
    );
  }

  // Get tour details
  const tour = await sharedTourService.getTourWithAvailability(tour_id);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tour not found' },
      { status: 404 }
    );
  }

  // Check if discount already applied
  const tourWithDiscount = await query<{
    discount_type: string | null;
    discount_amount: number | null;
  }>(`
    SELECT discount_type, discount_amount
    FROM shared_tours
    WHERE id = $1
  `, [tour_id]);

  if (tourWithDiscount.rows[0]?.discount_type && tourWithDiscount.rows[0]?.discount_type !== 'none') {
    return NextResponse.json(
      { success: false, error: 'A discount has already been applied to this tour' },
      { status: 400 }
    );
  }

  // Calculate new prices
  const originalBasePrice = Number(tour.base_price_per_person);
  const originalLunchPrice = Number(tour.lunch_price_per_person);

  let newBasePrice: number;
  let newLunchPrice: number;

  if (body.discount_type === 'flat') {
    newBasePrice = Math.max(0, originalBasePrice - body.discount_amount);
    newLunchPrice = Math.max(0, originalLunchPrice - body.discount_amount);
  } else {
    // Percentage discount
    const multiplier = 1 - (body.discount_amount / 100);
    newBasePrice = Math.round(originalBasePrice * multiplier * 100) / 100;
    newLunchPrice = Math.round(originalLunchPrice * multiplier * 100) / 100;
  }

  // Get all paid tickets for this tour
  const ticketsResult = await query<{
    id: string;
    ticket_number: string;
    customer_name: string;
    customer_email: string;
    ticket_count: number;
    includes_lunch: boolean;
    price_per_person: number;
    total_amount: number;
    payment_status: string;
    status: string;
    stripe_payment_intent_id: string | null;
  }>(`
    SELECT
      id, ticket_number, customer_name, customer_email, ticket_count,
      includes_lunch, price_per_person, total_amount, payment_status, status,
      stripe_payment_intent_id
    FROM shared_tours_tickets
    WHERE tour_id = $1
    ORDER BY created_at
  `, [tour_id]);

  const warnings: string[] = [];
  const ticketsAffected: TicketRefundPreview[] = [];
  let totalRefund = 0;

  for (const ticket of ticketsResult.rows) {
    // Skip cancelled tickets
    if (ticket.status === 'cancelled') {
      continue;
    }

    // Calculate refund for paid tickets
    if (ticket.payment_status === 'paid') {
      const originalPricePerPerson = Number(ticket.price_per_person);
      const newPricePerPerson = ticket.includes_lunch ? newLunchPrice : newBasePrice;

      let refundPerPerson: number;
      if (body.discount_type === 'flat') {
        refundPerPerson = body.discount_amount;
      } else {
        refundPerPerson = Math.round(originalPricePerPerson * (body.discount_amount / 100) * 100) / 100;
      }

      const refundAmount = Math.round(refundPerPerson * ticket.ticket_count * 100) / 100;

      if (!ticket.stripe_payment_intent_id) {
        warnings.push(`Ticket ${ticket.ticket_number} (${ticket.customer_name}) was paid but has no Stripe payment intent - manual refund may be needed`);
      }

      ticketsAffected.push({
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        ticket_count: ticket.ticket_count,
        includes_lunch: ticket.includes_lunch,
        original_paid: Number(ticket.total_amount),
        new_price: Math.round(newPricePerPerson * ticket.ticket_count * 100) / 100,
        refund_amount: refundAmount,
        stripe_payment_intent_id: ticket.stripe_payment_intent_id,
      });

      totalRefund += refundAmount;
    } else if (ticket.payment_status === 'pending') {
      // Unpaid tickets will just get the new price when they pay
      warnings.push(`Ticket ${ticket.ticket_number} (${ticket.customer_name}) is unpaid - will use new discounted price when paid`);
    }
  }

  const preview: DiscountPreview = {
    original_base_price: originalBasePrice,
    new_base_price: newBasePrice,
    original_lunch_price: originalLunchPrice,
    new_lunch_price: newLunchPrice,
    tickets_affected: ticketsAffected,
    total_refund: Math.round(totalRefund * 100) / 100,
    can_apply: true,
    warnings,
  };

  // If not confirmed, just return preview
  if (!body.confirmed) {
    return NextResponse.json({
      success: true,
      preview,
    });
  }

  // ============================================================================
  // APPLY DISCOUNT AND ISSUE REFUNDS
  // ============================================================================

  // Shared tours use default Stripe account (NW Touring)
  const stripe = getBrandStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Payment processing not configured' },
      { status: 500 }
    );
  }
  const refundResults: Array<{
    ticket_id: string;
    ticket_number: string;
    refund_id: string | null;
    amount: number;
    status: 'succeeded' | 'failed' | 'skipped';
    error?: string;
  }> = [];

  // Start transaction
  try {
    // Update tour pricing
    await query(`
      UPDATE shared_tours
      SET
        base_price_per_person = $2,
        lunch_price_per_person = $3,
        discount_type = $4,
        discount_amount = $5,
        discount_reason = $6,
        discount_applied_at = NOW(),
        discount_applied_by = $7,
        updated_at = NOW()
      WHERE id = $1
    `, [
      tour_id,
      newBasePrice,
      newLunchPrice,
      body.discount_type,
      body.discount_amount,
      body.reason || null,
      session.email,
    ]);

    // Process refunds for each affected ticket
    for (const ticket of ticketsAffected) {
      if (!ticket.stripe_payment_intent_id) {
        refundResults.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          refund_id: null,
          amount: ticket.refund_amount,
          status: 'skipped',
          error: 'No Stripe payment intent - manual refund needed',
        });
        continue;
      }

      try {
        // Create Stripe refund (partial refund)
        const refund = await stripe.refunds.create({
          payment_intent: ticket.stripe_payment_intent_id,
          amount: Math.round(ticket.refund_amount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            type: 'shared_tour_discount',
            tour_id: tour_id,
            ticket_id: ticket.ticket_id,
            discount_type: body.discount_type,
            discount_amount: String(body.discount_amount),
            discount_reason: body.reason || '',
          },
        });

        // Update ticket with refund info
        await query(`
          UPDATE shared_tours_tickets
          SET
            refund_amount = COALESCE(refund_amount, 0) + $2,
            refund_id = $3,
            refund_status = $4,
            refunded_at = NOW(),
            original_price_per_person = COALESCE(original_price_per_person, price_per_person),
            original_total_amount = COALESCE(original_total_amount, total_amount),
            price_per_person = $5,
            total_amount = $6,
            payment_status = 'partial_refund',
            updated_at = NOW()
          WHERE id = $1
        `, [
          ticket.ticket_id,
          ticket.refund_amount,
          refund.id,
          refund.status,
          ticket.includes_lunch ? newLunchPrice : newBasePrice,
          ticket.new_price,
        ]);

        refundResults.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          refund_id: refund.id,
          amount: ticket.refund_amount,
          status: 'succeeded',
        });

        logger.info('Discount refund issued', {
          tourId: tour_id,
          ticketId: ticket.ticket_id,
          refundId: refund.id,
          amount: ticket.refund_amount,
        });
      } catch (refundError) {
        const errorMessage = refundError instanceof Error ? refundError.message : 'Unknown error';
        logger.error('Failed to issue discount refund', {
          tourId: tour_id,
          ticketId: ticket.ticket_id,
          error: errorMessage,
        });

        refundResults.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          refund_id: null,
          amount: ticket.refund_amount,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    // Update unpaid tickets to use new pricing
    await query(`
      UPDATE shared_tours_tickets
      SET
        price_per_person = CASE
          WHEN includes_lunch THEN $2
          ELSE $3
        END,
        total_amount = ticket_count * CASE
          WHEN includes_lunch THEN $2
          ELSE $3
        END,
        updated_at = NOW()
      WHERE tour_id = $1
        AND payment_status = 'pending'
        AND status != 'cancelled'
    `, [tour_id, newLunchPrice, newBasePrice]);

    // Get updated tour
    const updatedTour = await sharedTourService.getTourWithAvailability(tour_id);

    const successCount = refundResults.filter(r => r.status === 'succeeded').length;
    const failedCount = refundResults.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Discount applied. ${successCount} refund(s) processed successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      refunds_issued: refundResults,
      tour: updatedTour,
    });
  } catch (error) {
    logger.error('Failed to apply discount', {
      tourId: tour_id,
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to apply discount. Please try again.' },
      { status: 500 }
    );
  }
});
