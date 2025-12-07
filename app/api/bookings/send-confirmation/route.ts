/**
 * Send Booking Confirmation Email API
 * 
 * ✅ REFACTORED: Service layer handles email logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { emailService } from '@/lib/services/email.service';

/**
 * POST /api/bookings/send-confirmation
 * Send booking confirmation email to customer
 * 
 * ✅ REFACTORED: Reduced from 98 lines to 25 lines
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { booking_number } = body;

  if (!booking_number) {
    throw new BadRequestError('booking_number is required');
  }

  const result = await emailService.sendBookingConfirmation(booking_number);

  return NextResponse.json({
    success: true,
    data: result,
    message: result.email_sent 
      ? 'Confirmation email sent successfully' 
      : 'Booking confirmed (email not configured)',
    timestamp: new Date().toISOString(),
  });
});
