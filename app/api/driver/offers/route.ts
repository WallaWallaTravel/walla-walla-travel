import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

interface TourOffer {
  id: number;
  booking_id: number;
  driver_id: number;
  vehicle_id: number;
  offered_at: string;
  expires_at: string;
  status: string;
  notes: string;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  pickup_location: string;
  estimated_hours: string;
  hourly_rate: string;
  total_pay: string;
  vehicle_name: string;
  vehicle_model: string;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const driver_id = searchParams.get('driver_id');

  if (!driver_id) {
    throw new BadRequestError('driver_id is required');
  }

  const offers = await queryMany<TourOffer>(`
    SELECT 
      tof.id,
      tof.booking_id,
      tof.driver_id,
      tof.vehicle_id,
      tof.offered_at,
      tof.expires_at,
      tof.status,
      tof.notes,
      b.booking_number,
      b.customer_name,
      b.tour_date,
      b.start_time,
      b.end_time,
      b.party_size,
      b.pickup_location,
      b.estimated_hours,
      b.hourly_rate,
      (b.estimated_hours * b.hourly_rate) as total_pay,
      CONCAT(v.make, ' ', v.model) as vehicle_name,
      v.model as vehicle_model
    FROM tour_offers tof
    JOIN bookings b ON tof.booking_id = b.id
    LEFT JOIN vehicles v ON tof.vehicle_id = v.id
    WHERE tof.driver_id = $1
    AND (tof.status = 'pending' OR tof.response_at > NOW() - INTERVAL '7 days')
    ORDER BY 
      CASE tof.status 
        WHEN 'pending' THEN 1
        ELSE 2
      END,
      tof.offered_at DESC
  `, [driver_id]);

  return NextResponse.json({
    success: true,
    offers,
  });
});
