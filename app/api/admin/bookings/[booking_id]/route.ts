/**
 * Admin Booking API - Individual Booking Operations
 *
 * GET    /api/admin/bookings/:booking_id - Get booking details
 * DELETE /api/admin/bookings/:booking_id - Permanently delete booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ booking_id: string }>;
}

// GET - Get booking details
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    if (!session?.role || !['admin', 'staff'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: { message: 'Admin access required', statusCode: 401 } },
        { status: 401 }
      );
    }

    const { booking_id } = await context.params;
    const bookingId = parseInt(booking_id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid booking ID', statusCode: 400 } },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT
        b.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        v.name as vehicle_name,
        d.name as driver_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users d ON b.driver_id = d.id
      WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Booking not found', statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching booking', { error });
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch booking', statusCode: 500 } },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete booking
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    if (!session?.role || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { message: 'Admin access required', statusCode: 401 } },
        { status: 401 }
      );
    }

    const { booking_id } = await context.params;
    const bookingId = parseInt(booking_id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid booking ID', statusCode: 400 } },
        { status: 400 }
      );
    }

    // Get booking info for logging
    const bookingResult = await query(
      `SELECT b.booking_number, c.name as customer_name
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Booking not found', statusCode: 404 } },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Delete related records first (in order of dependencies)
    // 1. Delete booking stops
    await query('DELETE FROM booking_stops WHERE booking_id = $1', [bookingId]);

    // 2. Delete vehicle availability blocks for this booking
    await query(
      `DELETE FROM vehicle_availability_blocks
       WHERE booking_id = $1`,
      [bookingId]
    );

    // 3. Delete activity log entries
    await query('DELETE FROM activity_log WHERE booking_id = $1', [bookingId]);

    // 4. Delete the booking itself
    await query('DELETE FROM bookings WHERE id = $1', [bookingId]);

    logger.info('Booking permanently deleted', {
      bookingId,
      bookingNumber: booking.booking_number,
      customerName: booking.customer_name,
      deletedBy: session.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking permanently deleted',
      data: {
        id: bookingId,
        booking_number: booking.booking_number,
      },
    });
  } catch (error) {
    logger.error('Error deleting booking', { error });
    return NextResponse.json(
      { success: false, error: { message: 'Failed to delete booking', statusCode: 500 } },
      { status: 500 }
    );
  }
}
