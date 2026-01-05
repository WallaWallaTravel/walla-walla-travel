/**
 * Admin Calendar API
 *
 * Returns combined data for the admin calendar:
 * - Bookings for the month
 * - Availability blocks (maintenance, blackout, holds)
 * - Vehicle summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';

export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Verify admin access
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calculate date range for the month (with buffer for calendar display)
    const startDate = new Date(year, month - 1, 1);
    startDate.setDate(startDate.getDate() - 7); // Include previous week
    const endDate = new Date(year, month, 7); // Include first week of next month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch bookings
    const bookingsResult = await query(
      `SELECT
        b.id,
        b.booking_number,
        b.tour_date,
        b.pickup_time as start_time,
        b.party_size,
        b.status,
        b.vehicle_id,
        b.driver_id,
        c.name as customer_name,
        v.name as vehicle_name,
        d.name as driver_name
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN drivers d ON b.driver_id = d.id
       WHERE b.tour_date >= $1 AND b.tour_date <= $2
       ORDER BY b.tour_date, b.pickup_time`,
      [startDateStr, endDateStr]
    );

    // Fetch availability blocks
    const blocksResult = await query(
      `SELECT
        vab.id,
        vab.vehicle_id,
        vab.block_date,
        vab.start_time,
        vab.end_time,
        vab.block_type,
        vab.reason,
        vab.booking_id,
        vab.created_at,
        v.name as vehicle_name
       FROM vehicle_availability_blocks vab
       LEFT JOIN vehicles v ON vab.vehicle_id = v.id
       WHERE vab.block_date >= $1 AND vab.block_date <= $2
       ORDER BY vab.block_date, vab.start_time`,
      [startDateStr, endDateStr]
    );

    // Fetch vehicles for summary
    const vehiclesResult = await query(
      `SELECT id, name, capacity, is_active
       FROM vehicles
       WHERE is_active = true
       ORDER BY name`
    );

    // Fetch drivers
    const driversResult = await query(
      `SELECT id, name, is_active
       FROM drivers
       WHERE is_active = true
       ORDER BY name`
    );

    // Calculate daily summaries
    const dailySummaries: Record<string, {
      bookings: number;
      blockedVehicles: number;
      availableVehicles: number;
      totalCapacity: number;
      bookedCapacity: number;
    }> = {};

    const totalVehicles = vehiclesResult.rows.length;
    const totalCapacity = vehiclesResult.rows.reduce((sum, v) => sum + (v.capacity || 14), 0);

    // Group bookings by date
    const bookingsByDate: Record<string, typeof bookingsResult.rows> = {};
    for (const booking of bookingsResult.rows) {
      const dateStr = booking.tour_date.toISOString().split('T')[0];
      if (!bookingsByDate[dateStr]) bookingsByDate[dateStr] = [];
      bookingsByDate[dateStr].push(booking);
    }

    // Group blocks by date and vehicle
    const blocksByDate: Record<string, typeof blocksResult.rows> = {};
    for (const block of blocksResult.rows) {
      const dateStr = block.block_date.toISOString().split('T')[0];
      if (!blocksByDate[dateStr]) blocksByDate[dateStr] = [];
      blocksByDate[dateStr].push(block);
    }

    // Calculate summary for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayBookings = bookingsByDate[dateStr] || [];
      const dayBlocks = blocksByDate[dateStr] || [];

      // Count unique blocked vehicles
      const blockedVehicleIds = new Set(dayBlocks.map(b => b.vehicle_id));
      // Count vehicles with bookings
      const bookedVehicleIds = new Set(dayBookings.map(b => b.vehicle_id).filter(Boolean));

      // Available = total - blocked - booked (rough estimate)
      const unavailableCount = new Set([...blockedVehicleIds, ...bookedVehicleIds]).size;

      dailySummaries[dateStr] = {
        bookings: dayBookings.length,
        blockedVehicles: blockedVehicleIds.size,
        availableVehicles: Math.max(0, totalVehicles - unavailableCount),
        totalCapacity,
        bookedCapacity: dayBookings.reduce((sum, b) => sum + (b.party_size || 0), 0)
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      bookings: bookingsResult.rows.map(b => ({
        ...b,
        tour_date: b.tour_date.toISOString().split('T')[0]
      })),
      blocks: blocksResult.rows.map(b => ({
        ...b,
        block_date: b.block_date.toISOString().split('T')[0]
      })),
      vehicles: vehiclesResult.rows,
      drivers: driversResult.rows,
      dailySummaries,
      meta: {
        year,
        month,
        startDate: startDateStr,
        endDate: endDateStr,
        totalVehicles,
        totalCapacity
      }
  });
});
