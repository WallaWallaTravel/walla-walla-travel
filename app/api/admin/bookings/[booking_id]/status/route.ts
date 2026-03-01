import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { query, queryOne } from '@/lib/db-helpers';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']),
  reason: z.string().optional(),
});

/**
 * PATCH /api/admin/bookings/[booking_id]/status
 * Update booking status (confirm, complete, etc.)
 */
export const PATCH = withAdminAuth(async (
  request: NextRequest,
  session: AuthSession,
  context
) => {
  const { booking_id } = await context!.params;
  const bookingId = parseInt(booking_id);

  if (isNaN(bookingId)) {
    throw new BadRequestError('Invalid booking ID');
  }

  const body = await request.json();
  const parsed = UpdateStatusSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(`Invalid request: ${parsed.error.issues[0]?.message}`);
  }

  const { status, reason } = parsed.data;

  // Get current booking
  const booking = await queryOne(
    `SELECT id, status, booking_number FROM bookings WHERE id = $1`,
    [bookingId]
  );

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['assigned', 'in_progress', 'completed', 'cancelled'],
    assigned: ['in_progress', 'completed', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Can't change from completed
    cancelled: [], // Can't change from cancelled
  };

  const allowed = validTransitions[booking.status] || [];
  if (!allowed.includes(status)) {
    throw new BadRequestError(
      `Cannot change status from '${booking.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`
    );
  }

  // Update the status
  const result = await query(
    `UPDATE bookings
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, bookingId]
  );

  // Log the status change
  logger.info('[Booking] Status updated', {
    bookingId,
    bookingNumber: booking.booking_number,
    oldStatus: booking.status,
    newStatus: status,
    reason,
    updatedBy: parseInt(session.userId),
  });

  // Audit log: booking status change
  auditService.logFromRequest(request, parseInt(session.userId), 'booking_status_changed', {
    bookingId,
    bookingNumber: booking.booking_number,
    oldStatus: booking.status,
    newStatus: status,
    reason,
  }).catch(() => {}); // Non-blocking

  // Create timeline entry
  // Column is event_description (not description) per Prisma schema
  await query(
    `INSERT INTO booking_timeline (booking_id, event_type, event_description, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [
      bookingId,
      `status_${status}`,
      reason || `Status changed to ${status}`,
    ]
  ).catch(err => {
    logger.warn('[Booking] Failed to create timeline entry', { error: err });
  });

  return NextResponse.json({
    success: true,
    message: `Booking status updated to '${status}'`,
    data: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});
