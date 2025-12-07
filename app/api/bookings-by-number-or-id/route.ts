import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db-helpers';
import { withErrorHandling, NotFoundError, BadRequestError } from '@/lib/api-errors';

/**
 * GET /api/bookings-by-number-or-id?id=123 or ?booking_number=BK-2024-001
 * Get booking by booking number or ID
 */
export const GET = withErrorHandling(async (
  request: NextRequest
) => {
  const identifier = request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('booking_number');
  
  if (!identifier) {
    throw new BadRequestError('Missing id or booking_number parameter');
  }

  // Try as booking number first, then as ID
  let booking;
  
  if (isNaN(Number(identifier))) {
    // It's a booking number (e.g., "BK-2024-001")
    booking = await queryOne(`
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
        b.dropoff_location,
        b.special_requests,
        b.status,
        b.base_price,
        b.total_price,
        b.deposit_amount,
        b.deposit_paid,
        b.final_payment_amount,
        b.final_payment_paid,
        b.created_at,
        u.name as driver_name,
        v.make as vehicle_make,
        v.model as vehicle_model
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      LEFT JOIN vehicle_assignments va ON va.booking_id = b.id
      LEFT JOIN vehicles v ON va.vehicle_id = v.id
      WHERE b.booking_number = $1
    `, [identifier]);
  } else {
    // It's an ID
    booking = await queryOne(`
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
        b.dropoff_location,
        b.special_requests,
        b.status,
        b.base_price,
        b.total_price,
        b.deposit_amount,
        b.deposit_paid,
        b.final_payment_amount,
        b.final_payment_paid,
        b.created_at,
        u.name as driver_name,
        v.make as vehicle_make,
        v.model as vehicle_model
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      LEFT JOIN vehicle_assignments va ON va.booking_id = b.id
      LEFT JOIN vehicles v ON va.vehicle_id = v.id
      WHERE b.id = $1
    `, [parseInt(identifier)]);
  }

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  return NextResponse.json({
    success: true,
    data: booking,
  });
});

