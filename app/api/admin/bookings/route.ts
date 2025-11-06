import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

/**
 * GET /api/admin/bookings
 * Get all bookings with filters
 * 
 * Query params:
 * - start_date: Filter by start date
 * - end_date: Filter by end date
 * - status: Filter by status
 * - driver_id: Filter by driver
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const status = searchParams.get('status');
  const driverId = searchParams.get('driver_id');

  let query = `
    SELECT 
      b.id,
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
      b.status,
      b.total_price,
      b.deposit_paid,
      b.final_payment_paid,
      b.driver_id,
      u.name as driver_name,
      b.created_at,
      va.vehicle_id,
      CONCAT(v.make, ' ', v.model) as vehicle_name,
      (SELECT COUNT(*) FROM itinerary_stops ist 
       JOIN itineraries i ON ist.itinerary_id = i.id 
       WHERE i.booking_id = b.id) as winery_count
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    LEFT JOIN vehicle_assignments va ON va.booking_id = b.id
    LEFT JOIN vehicles v ON va.vehicle_id = v.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND b.tour_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND b.tour_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (status) {
    query += ` AND b.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (driverId) {
    query += ` AND b.driver_id = $${paramIndex}`;
    params.push(parseInt(driverId));
    paramIndex++;
  }

  query += ` ORDER BY b.tour_date ASC, b.start_time ASC`;

  const bookings = await queryMany(query, params);

  return NextResponse.json({
    success: true,
    data: {
      bookings,
      count: bookings.length,
    },
  });
});

