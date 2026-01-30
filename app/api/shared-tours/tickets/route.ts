import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, ConflictError } from '@/lib/api/middleware/error-handler';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * POST /api/shared-tours/tickets
 * Create a new ticket purchase
 * Public endpoint for customer bookings
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate required fields
  const required = ['tour_id', 'ticket_count', 'customer_name', 'customer_email'];
  for (const field of required) {
    if (!body[field]) {
      throw new BadRequestError(`Missing required field: ${field}`);
    }
  }

  // Validate ticket count
  if (body.ticket_count < 1 || body.ticket_count > 14) {
    throw new BadRequestError('Ticket count must be between 1 and 14');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customer_email)) {
    throw new BadRequestError('Invalid email format');
  }

  // Create the ticket - service may throw availability errors
  try {
    const ticket = await sharedTourService.createTicket({
      tour_id: body.tour_id,
      ticket_count: body.ticket_count,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      guest_names: body.guest_names,
      includes_lunch: body.includes_lunch ?? true,
      dietary_restrictions: body.dietary_restrictions,
      special_requests: body.special_requests,
      referral_source: body.referral_source,
      promo_code: body.promo_code,
    });

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully. Please complete payment to confirm.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Handle availability errors with 409 Conflict
    if (message.includes('spots') || message.includes('available') || message.includes('sold out')) {
      throw new ConflictError(message);
    }
    throw error;
  }
});

/**
 * GET /api/shared-tours/tickets
 * Get tickets by email (customer lookup)
 */
export const GET = withErrorHandling<unknown>(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');
  const ticketNumber = searchParams.get('ticket_number');

  if (ticketNumber) {
    const ticket = await sharedTourService.getTicketByNumber(ticketNumber);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }
    return NextResponse.json({
      success: true,
      data: ticket,
    });
  }

  if (email) {
    const tickets = await sharedTourService.getTicketsByEmail(email);
    return NextResponse.json({
      success: true,
      data: tickets,
      count: tickets.length,
    });
  }

  throw new BadRequestError('Please provide email or ticket_number');
});
