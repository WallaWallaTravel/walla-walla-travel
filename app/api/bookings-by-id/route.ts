import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError } from '@/lib/api-errors';
import { queryOne } from '@/lib/db-helpers';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  pickup_location: string;
  status: string;
  base_price: number;
  total_price: number;
  driver_name?: string;
  vehicle_make?: string;
  vehicle_model?: string;
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { booking_id: string } }
) => {
  const booking_id = parseInt(params.booking_id);

  const booking = await queryOne<Booking>(`
    SELECT 
      b.id,
      b.booking_number,
      b.customer_name,
      b.customer_email,
      b.customer_phone,
      b.party_size,
      b.tour_date,
      b.start_time,
      b.end_time,
      b.duration_hours,
      b.pickup_location,
      b.status,
      b.base_price,
      b.total_price,
      u.name as driver_name,
      v.make as vehicle_make,
      v.model as vehicle_model
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    LEFT JOIN vehicle_assignments va ON va.booking_id = b.id
    LEFT JOIN vehicles v ON va.vehicle_id = v.id
    WHERE b.id = $1
  `, [booking_id]);

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  return NextResponse.json(booking);
});
