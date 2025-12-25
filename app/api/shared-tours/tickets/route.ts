import { NextRequest, NextResponse } from 'next/server';
import { sharedTourService } from '@/lib/services/shared-tour.service';

/**
 * POST /api/shared-tours/tickets
 * Create a new ticket purchase
 * Public endpoint for customer bookings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['tour_id', 'ticket_count', 'customer_name', 'customer_email'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate ticket count
    if (body.ticket_count < 1 || body.ticket_count > 14) {
      return NextResponse.json(
        { success: false, error: 'Ticket count must be between 1 and 14' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer_email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create the ticket
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
  } catch (error: any) {
    console.error('Error creating ticket:', error);

    // Handle availability errors
    if (error.message.includes('spots') || error.message.includes('available') || error.message.includes('sold out')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shared-tours/tickets
 * Get tickets by email (customer lookup)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const ticketNumber = searchParams.get('ticket_number');

    if (ticketNumber) {
      const ticket = await sharedTourService.getTicketByNumber(ticketNumber);
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Ticket not found' },
          { status: 404 }
        );
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

    return NextResponse.json(
      { success: false, error: 'Please provide email or ticket_number' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
