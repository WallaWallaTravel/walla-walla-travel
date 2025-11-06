import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

interface ItineraryStop {
  id: number;
  stop_order: number;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  notes: string;
  winery_name: string;
  winery_address: string;
  winery_phone: string;
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { booking_id: string } }
) => {
  const booking_id = parseInt(params.booking_id);

  const stops = await queryMany<ItineraryStop>(`
    SELECT 
      ist.id,
      ist.stop_order,
      ist.arrival_time,
      ist.departure_time,
      ist.duration_minutes,
      ist.notes,
      w.name as winery_name,
      w.address as winery_address,
      w.phone as winery_phone
    FROM itinerary_stops ist
    JOIN itineraries i ON ist.itinerary_id = i.id
    JOIN wineries w ON ist.winery_id = w.id
    WHERE i.booking_id = $1
    ORDER BY ist.stop_order
  `, [booking_id]);

  return NextResponse.json(stops);
});
