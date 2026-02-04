import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * POST /api/shared-tours/tickets/[ticket_id]/payment-intent
 * Create or retrieve a payment intent for a ticket
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ ticket_id: string }> }
) => {
  const { ticket_id } = await params;

  if (!ticket_id) {
    throw new BadRequestError('Ticket ID is required');
  }

  // Check if ticket exists
  const ticket = await sharedTourService.getTicketById(ticket_id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  if (ticket.payment_status === 'paid') {
    throw new BadRequestError('Ticket is already paid');
  }

  // Get or create payment intent
  let paymentIntent;
  if (ticket.stripe_payment_intent_id) {
    paymentIntent = await sharedTourService.getPaymentIntentClientSecret(ticket_id);
  } else {
    paymentIntent = await sharedTourService.createPaymentIntent(ticket_id);
  }

  if (!paymentIntent) {
    throw new BadRequestError('Failed to create payment intent');
  }

  return NextResponse.json({
    success: true,
    data: {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount: paymentIntent.amount,
      ticketNumber: ticket.ticket_number,
    },
  });
});

/**
 * GET /api/shared-tours/tickets/[ticket_id]/payment-intent
 * Get payment status for a ticket
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ ticket_id: string }> }
) => {
  const { ticket_id } = await params;

  if (!ticket_id) {
    throw new BadRequestError('Ticket ID is required');
  }

  const ticket = await sharedTourService.getTicketById(ticket_id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  return NextResponse.json({
    success: true,
    data: {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      paymentStatus: ticket.payment_status,
      totalAmount: ticket.total_amount,
      paidAt: ticket.paid_at,
      hasPaymentIntent: !!ticket.stripe_payment_intent_id,
    },
  });
});
