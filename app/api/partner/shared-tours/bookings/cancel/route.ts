/**
 * POST /api/partner/shared-tours/bookings/cancel
 *
 * Allows hotel partners to cancel their own bookings with a reason.
 * Only cancels tickets that belong to the authenticated hotel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const CancelBookingSchema = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required'),
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters').max(500),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
    const session = await getHotelSessionFromRequest(request);
    if (!session?.hotelId) {
      throw new UnauthorizedError('Hotel authentication required');
    }

    const hotel = await hotelPartnerService.getHotelById(session.hotelId);
    if (!hotel || !hotel.is_active) {
      throw new ForbiddenError('Hotel account is deactivated');
    }

    const body = await request.json();
    const parsed = CancelBookingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0].message);
    }

    const { ticketId, reason } = parsed.data;

    // Verify ticket belongs to this hotel
    const ticketRows = await prisma.$queryRaw<{ id: string; status: string; hotel_partner_id: string; ticket_number: string }[]>`
      SELECT id, status, hotel_partner_id, ticket_number
      FROM shared_tour_tickets
      WHERE id = ${ticketId}
    `;

    const ticket = ticketRows[0];
    if (!ticket) {
      throw new NotFoundError('Booking not found');
    }

    if (String(ticket.hotel_partner_id) !== String(session.hotelId)) {
      throw new ForbiddenError('You can only cancel your own hotel bookings');
    }

    if (ticket.status === 'cancelled') {
      throw new BadRequestError('This booking is already cancelled');
    }

    // Cancel the ticket
    const cancelled = await sharedTourService.cancelTicket(ticketId, reason);

    if (!cancelled) {
      throw new BadRequestError('Failed to cancel booking');
    }

    logger.info('Hotel partner cancelled booking', {
      hotelId: session.hotelId,
      ticketId,
      ticketNumber: ticket.ticket_number,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      ticketNumber: cancelled.ticket_number,
    });
  });
