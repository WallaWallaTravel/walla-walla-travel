import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';

/**
 * GET /api/partner/shared-tours
 * List upcoming tours available for booking (hotel partner view)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Get hotel ID from server-side session cookie (preferred) or legacy header
  const session = await getHotelSessionFromRequest(request);
  const hotelId = session?.hotelId || request.headers.get('x-hotel-id');

  if (!hotelId) {
    throw new UnauthorizedError('Hotel authentication required');
  }

  // Verify hotel exists and is active
  const hotel = await hotelPartnerService.getHotelById(hotelId);
  if (!hotel || !hotel.is_active) {
    throw new UnauthorizedError('Invalid or inactive hotel account');
  }

  // Get upcoming tours with availability
  const tours = await sharedTourService.getUpcomingTours();

  // Filter to only accepting bookings
  const availableTours = tours.filter(t => t.accepting_bookings && t.is_published);

  return NextResponse.json({
    success: true,
    data: availableTours.map(tour => ({
      id: tour.id,
      tour_date: tour.tour_date,
      start_time: tour.start_time,
      duration_hours: tour.duration_hours,
      title: tour.title,
      description: tour.description,
      meeting_location: tour.meeting_location,
      base_price_per_person: tour.base_price_per_person,
      lunch_price_per_person: tour.lunch_price_per_person,
      spots_available: tour.spots_available,
      max_guests: tour.max_guests,
      minimum_met: tour.minimum_met,
    })),
    count: availableTours.length,
  });
});
