import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError } from '@/lib/api-errors';
import { queryOne, queryMany } from '@/lib/db-helpers';
import { generateItineraryHTML, generateItineraryText } from '@/lib/pdf-generator';

/**
 * GET /api/bookings/[booking_id]/itinerary-pdf
 * Generate and download PDF itinerary
 * 
 * Query params:
 * - format: 'html' (default) or 'text'
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { booking_id: string } }
) => {
  const bookingId = parseInt(params.booking_id);
  const format = request.nextUrl.searchParams.get('format') || 'html';

  if (isNaN(bookingId)) {
    throw new NotFoundError('Booking');
  }

  // Get booking details
  const booking = await queryOne<{
    booking_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    tour_date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    party_size: number;
    pickup_location: string;
    dropoff_location: string;
    special_requests: string;
    driver_name: string;
    vehicle_make: string;
    vehicle_model: string;
  }>(
    `SELECT 
      b.booking_number,
      b.customer_name,
      b.customer_email,
      b.customer_phone,
      b.tour_date,
      b.start_time,
      b.end_time,
      b.duration_hours,
      b.party_size,
      b.pickup_location,
      b.dropoff_location,
      b.special_requests,
      u.name as driver_name,
      v.make as vehicle_make,
      v.model as vehicle_model
     FROM bookings b
     LEFT JOIN users u ON b.driver_id = u.id
     LEFT JOIN vehicle_assignments va ON va.booking_id = b.id
     LEFT JOIN vehicles v ON va.vehicle_id = v.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Get winery stops
  const stops = await queryMany<{
    stop_order: number;
    winery_name: string;
    winery_address: string;
    winery_city: string;
    winery_phone: string;
    winery_website: string;
    arrival_time: string;
    departure_time: string;
    duration_minutes: number;
    notes: string;
  }>(
    `SELECT 
      ist.stop_order,
      w.name as winery_name,
      w.address as winery_address,
      w.city as winery_city,
      w.phone as winery_phone,
      w.website as winery_website,
      ist.arrival_time,
      ist.departure_time,
      ist.duration_minutes,
      ist.notes
     FROM itinerary_stops ist
     JOIN itineraries i ON ist.itinerary_id = i.id
     JOIN wineries w ON ist.winery_id = w.id
     WHERE i.booking_id = $1
     ORDER BY ist.stop_order`,
    [bookingId]
  );

  const itineraryData = { booking, stops };

  if (format === 'text') {
    // Return plain text version
    const textContent = generateItineraryText(itineraryData);
    
    return new NextResponse(textContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="itinerary-${booking.booking_number}.txt"`,
      },
    });
  } else {
    // Return HTML version (can be printed to PDF by browser)
    const htmlContent = generateItineraryHTML(itineraryData);
    
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="itinerary-${booking.booking_number}.html"`,
      },
    });
  }
});

