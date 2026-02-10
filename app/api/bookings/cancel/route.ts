import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { bookingService } from '@/lib/services/booking.service';
import { refundService } from '@/lib/services/refund.service';
import { auditService } from '@/lib/services/audit.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * POST /api/bookings/cancel
 * Cancel a booking and process refund per cancellation policy
 *
 * Cancellation Policy:
 * - 45+ days before tour: 100% refund of deposit
 * - 21-44 days before tour: 50% refund of deposit
 * - Under 21 days: No refund of deposit
 */

const CancelBookingSchema = z.object({
  booking_id: z.number().int().positive(),
  reason: z.string().optional(),
});

export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withAuth(async (request: NextRequest, session) => {
  // Validate
  const { booking_id, reason } = await validateBody(request, CancelBookingSchema);

  // Cancel booking (releases vehicle, syncs CRM, etc.)
  const booking = await bookingService.cancel(booking_id, reason);

  // Audit log: booking cancellation
  auditService.logFromRequest(request, parseInt(session.userId), 'booking_cancelled', {
    bookingId: booking_id,
    reason,
  }).catch(() => {}); // Non-blocking

  // Process refund based on cancellation policy (async, don't block response)
  let refundResult = null;
  try {
    refundResult = await refundService.processBookingRefund(booking_id);
  } catch (err) {
    logger.error('Refund processing failed during cancellation', {
      bookingId: booking_id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      booking,
      refund: refundResult ? {
        amount: refundResult.refundAmount,
        percentage: refundResult.refundPercentage,
        policy: refundResult.policyApplied,
        stripeRefundId: refundResult.stripeRefundId || null,
      } : null,
    },
    message: refundResult && refundResult.refundAmount > 0
      ? `Booking cancelled. Refund of $${refundResult.refundAmount.toFixed(2)} (${refundResult.refundPercentage}%) is being processed.`
      : 'Booking cancelled successfully.',
    timestamp: new Date().toISOString(),
  });
})));
