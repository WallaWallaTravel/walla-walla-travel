/**
 * Admin Booking API - Individual Booking Operations
 *
 * GET    /api/admin/bookings/:booking_id - Get booking details
 * DELETE /api/admin/bookings/:booking_id - Permanently delete booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/services/audit.service';
import { logger } from '@/lib/logger';

// GET - Get booking details
export const GET = withAdminAuth(
  async (request: NextRequest, _session, context): Promise<NextResponse> => {
    const { booking_id } = await context!.params;
    const bookingId = parseInt(booking_id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid booking ID', statusCode: 400 } },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
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
      WHERE b.id = ${bookingId}`;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Booking not found', statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  }
);

// DELETE - Permanently delete booking
export const DELETE = withAdminAuth(
  async (request: NextRequest, session, context): Promise<NextResponse> => {
    const { booking_id } = await context!.params;
    const bookingId = parseInt(booking_id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid booking ID', statusCode: 400 } },
        { status: 400 }
      );
    }

    // Get booking info for logging
    const bookingRows = await prisma.$queryRaw<{ booking_number: string; customer_name: string }[]>`
      SELECT b.booking_number, c.name as customer_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = ${bookingId}`;

    if (bookingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Booking not found', statusCode: 404 } },
        { status: 404 }
      );
    }

    const booking = bookingRows[0];

    // Delete related records first (in order of dependencies)
    // Use a helper to safely run queries even if tables don't exist
    const safeExecute = async (sql: string, id: number) => {
      try {
        await prisma.$executeRawUnsafe(sql, id);
      } catch (err) {
        // Ignore "relation does not exist" errors - table may not exist
        if (err instanceof Error && err.message.includes('does not exist')) {
          logger.info(`Table not found, skipping: ${sql.substring(0, 50)}...`);
          return;
        }
        throw err;
      }
    };

    // Tables with foreign keys to bookings - delete or nullify references
    await safeExecute('DELETE FROM booking_stops WHERE booking_id = $1', bookingId);
    await safeExecute('DELETE FROM booking_line_items WHERE booking_id = $1', bookingId);
    await safeExecute('DELETE FROM vehicle_availability_blocks WHERE booking_id = $1', bookingId);
    await safeExecute('DELETE FROM activity_log WHERE booking_id = $1', bookingId);

    // Nullify references in other tables
    await safeExecute('UPDATE trip_distances SET booking_id = NULL WHERE booking_id = $1', bookingId);
    await safeExecute('UPDATE commission_ledger SET booking_id = NULL WHERE booking_id = $1', bookingId);
    await safeExecute('UPDATE vehicle_incidents SET booking_id = NULL WHERE booking_id = $1', bookingId);
    await safeExecute('UPDATE crm_deals SET booking_id = NULL WHERE booking_id = $1', bookingId);
    await safeExecute('UPDATE trips SET converted_to_booking_id = NULL WHERE converted_to_booking_id = $1', bookingId);
    await safeExecute('UPDATE trip_proposals SET converted_to_booking_id = NULL WHERE converted_to_booking_id = $1', bookingId);
    await safeExecute('UPDATE experience_requests SET converted_booking_id = NULL WHERE converted_booking_id = $1', bookingId);
    await safeExecute('UPDATE abandoned_checkouts SET converted_to_booking_id = NULL WHERE converted_to_booking_id = $1', bookingId);
    await safeExecute('UPDATE shared_tours_tickets SET booking_id = NULL WHERE booking_id = $1', bookingId);

    // Delete the booking itself (this one must succeed)
    await prisma.$executeRaw`DELETE FROM bookings WHERE id = ${bookingId}`;

    logger.info('Booking permanently deleted', {
      bookingId,
      bookingNumber: booking.booking_number,
      customerName: booking.customer_name,
      deletedBy: session.email,
    });

    // Audit log: booking deleted (critical operation)
    auditService.logFromRequest(request, parseInt(session.userId || '0'), 'booking_deleted', {
      bookingId,
      bookingNumber: booking.booking_number,
      customerName: booking.customer_name,
    }).catch(() => {}); // Non-blocking

    return NextResponse.json({
      success: true,
      message: 'Booking permanently deleted',
      data: {
        id: bookingId,
        booking_number: booking.booking_number,
      },
    });
  }
);
