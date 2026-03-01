/**
 * Itinerary API (by booking ID)
 * 
 * ✅ REFACTORED: Service layer handles all business logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { itineraryService } from '@/lib/services/itinerary.service';
import { withCSRF } from '@/lib/api/middleware/csrf';

const PostBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  client_name: z.string().max(255).optional(),
  client_email: z.string().email().max(255).optional(),
  party_size: z.number().int().positive().optional(),
  start_date: z.string().max(50).optional(),
  end_date: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  internal_notes: z.string().max(5000).optional(),
  client_notes: z.string().max(5000).optional(),
});

const PutBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  client_name: z.string().max(255).optional(),
  client_email: z.string().email().max(255).optional(),
  party_size: z.number().int().positive().optional(),
  start_date: z.string().max(50).optional(),
  end_date: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  internal_notes: z.string().max(5000).optional(),
  client_notes: z.string().max(5000).optional(),
});

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
export const POST = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await context.params;
  const bookingId = parseInt(booking_id);
  const body = PostBodySchema.parse(await request.json());

  const itinerary = await itineraryService.create({
    booking_id: bookingId,
    ...body,
  });

  return NextResponse.json({
    success: true,
    data: itinerary,
    timestamp: new Date().toISOString(),
  });
})
);

/**
 * PUT /api/itineraries/[booking_id]
 * Update itinerary
 * 
 * ✅ REFACTORED: Service layer
 */
export const PUT = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await context.params;
  const bookingId = parseInt(booking_id);
  const body = PutBodySchema.parse(await request.json());

  const itinerary = await itineraryService.updateByBookingId(bookingId, body);

  return NextResponse.json({
    success: true,
    data: itinerary,
    timestamp: new Date().toISOString(),
  });
})
);

/**
 * DELETE /api/itineraries/[booking_id]
 * Delete itinerary
 * 
 * ✅ REFACTORED: Service layer
 */
export const DELETE = withCSRF(
  withErrorHandling(async (
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
})
);
