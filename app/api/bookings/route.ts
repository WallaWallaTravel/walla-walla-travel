/**
 * Bookings API Route
 * 
 * GET  /api/bookings - List bookings (with optional year/month filter)
 * POST /api/bookings - Create a new booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { bookingService } from '@/lib/services/booking.service';
import { sendBookingConfirmationEmail } from '@/lib/services/email-automation.service';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// Validation schema for creating a booking
const CreateBookingSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Invalid email address'),
  customer_phone: z.string().optional(),
  tour_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  tour_start_date: z.string().optional().nullable(),
  tour_end_date: z.string().optional().nullable(),
  start_time: z.string().optional(),
  pickup_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_hours: z.number().optional().default(6),
  party_size: z.number().int().min(1).max(50),
  pickup_location: z.string().optional(),
  dropoff_location: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional().default('pending'),
  tour_type: z.string().optional().default('wine_tour'),
  tour_duration_type: z.string().optional().default('single'),
  base_price: z.number().optional().default(0),
  total_price: z.number().optional().default(0),
  deposit_amount: z.number().optional().default(0),
  final_payment_amount: z.number().optional().default(0),
  driver_id: z.number().optional().nullable(),
  vehicle_id: z.number().optional().nullable(),
  referral_source: z.string().optional().nullable(),
  specific_social_media: z.string().optional().nullable(),
  specific_ai: z.string().optional().nullable(),
  hotel_concierge_name: z.string().optional().nullable(),
  referral_other_details: z.string().optional().nullable(),
  wine_tour_preference: z.string().optional().nullable(),
});

/**
 * GET /api/bookings
 * List bookings with optional year/month filter
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  const result = await bookingService.list({
    year: year || undefined,
    month: month || undefined,
    limit: 500, // Higher limit for admin views
  });

  return NextResponse.json({ 
    success: true, 
    bookings: result.data,
    total: result.total,
  });
});

/**
 * POST /api/bookings
 * Create a new booking
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.payment)(
    withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate request body
  const parseResult = CreateBookingSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.issues.map((e: { message: string }) => e.message).join(', ');
    throw new BadRequestError('Validation failed: ' + errorMessages);
  }

  const data = parseResult.data;

  // Create booking using the simple createBooking method
  const booking = await bookingService.createBooking({
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    customerPhone: data.customer_phone || '',
    partySize: data.party_size,
    tourDate: data.tour_date,
    startTime: data.start_time || data.pickup_time || '10:00',
    durationHours: data.duration_hours,
    totalPrice: data.total_price,
    depositPaid: data.deposit_amount,
  });

  // Send confirmation email (async, don't wait)
  if (booking.customer_email) {
    sendBookingConfirmationEmail(booking.id).catch(err => {
      logger.error('Failed to send confirmation email', { error: err, bookingId: booking.id });
    });
  }

  return NextResponse.json({
    success: true,
    booking,
    message: 'Booking created successfully',
  });
})));
