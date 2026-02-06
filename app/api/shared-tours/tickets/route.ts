import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError, ConflictError } from '@/lib/api/middleware/error-handler';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { CreateSharedTourTicketSchema } from '@/lib/api/schemas';
import { z } from 'zod';

/**
 * POST /api/shared-tours/tickets
 * Create a new ticket purchase
 * Public endpoint for customer bookings
 *
 * Uses Zod schema validation for robust input validation
 * Rate limited to prevent reservation spam (10 per 15 minutes per IP)
 */
export const POST = withRateLimit(rateLimiters.sharedTourTicket)(withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate with Zod schema
  let validatedData;
  try {
    validatedData = CreateSharedTourTicketSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors into readable messages
      const messages = error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      throw new BadRequestError(`Validation failed: ${messages}`);
    }
    throw error;
  }

  // Create the ticket - service may throw availability errors
  try {
    const ticket = await sharedTourService.createTicket({
      tour_id: validatedData.tour_id,
      ticket_count: validatedData.ticket_count,
      customer_name: validatedData.customer_name,
      customer_email: validatedData.customer_email,
      customer_phone: validatedData.customer_phone,
      guest_names: validatedData.guest_names,
      includes_lunch: validatedData.includes_lunch,
      dietary_restrictions: validatedData.dietary_restrictions,
      special_requests: validatedData.special_requests,
      referral_source: validatedData.referral_source,
      promo_code: validatedData.promo_code,
      hotel_partner_id: validatedData.hotel_partner_id,
      booked_by_hotel: validatedData.booked_by_hotel,
    });

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully. Please complete payment to confirm.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Handle availability errors with 409 Conflict
    if (message.includes('spots') || message.includes('available') || message.includes('sold out') || message.includes('full') || message.includes('cutoff')) {
      throw new ConflictError(message);
    }
    throw error;
  }
}));

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
