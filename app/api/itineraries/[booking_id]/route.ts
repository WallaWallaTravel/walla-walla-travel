/**
 * Itinerary API (by booking ID)
 * 
 * ✅ REFACTORED: Service layer handles all business logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { itineraryService } from '@/lib/services/itinerary.service';

/**
 * GET /api/itineraries/[booking_id]
 * Get itinerary for booking (with stops and wineries)
 * 
 * ✅ REFACTORED: Service layer
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await context.params;
  const bookingId = parseInt(booking_id);

  const itinerary = await itineraryService.getByBookingId(bookingId);

  return NextResponse.json({
    success: true,
    data: itinerary,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/itineraries/[booking_id]
 * Create new itinerary
 * 
 * ✅ REFACTORED: Service layer handles conflict checking
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await context.params;
  const bookingId = parseInt(booking_id);
  const body = await request.json();

  const itinerary = await itineraryService.create({
    booking_id: bookingId,
    ...body,
  });

  return NextResponse.json({
    success: true,
    data: itinerary,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/itineraries/[booking_id]
 * Update itinerary
 * 
 * ✅ REFACTORED: Service layer
 */
export const PUT = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await context.params;
  const bookingId = parseInt(booking_id);
  const body = await request.json();

  const itinerary = await itineraryService.updateByBookingId(bookingId, body);

  return NextResponse.json({
    success: true,
    data: itinerary,
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/itineraries/[booking_id]
 * Delete itinerary
 * 
 * ✅ REFACTORED: Service layer
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await context.params;
  const bookingId = parseInt(booking_id);

  await itineraryService.deleteByBookingId(bookingId);

  return NextResponse.json({
    success: true,
    message: 'Itinerary deleted',
    timestamp: new Date().toISOString(),
  });
});
