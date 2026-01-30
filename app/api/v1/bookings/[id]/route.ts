/**
 * Unified Booking Resource API - Individual Booking
 * Handles both numeric IDs and booking numbers (e.g., WWT-2025-12345)
 *
 * GET    /api/v1/bookings/:id - Get booking details
 * PATCH  /api/v1/bookings/:id - Update booking
 * DELETE /api/v1/bookings/:id - Cancel booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest } from '@/lib/api/validate';
import { rateLimiters } from '@/lib/api/middleware';
import { bookingService } from '@/lib/services/booking.service';
import { withErrorHandling, BadRequestError, RouteContext } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// GET /api/v1/bookings/:id - Get booking details
// ============================================================================

/**
 * Get single booking by ID or booking number
 *
 * Supports:
 * - Numeric ID: /api/v1/bookings/123
 * - Booking number: /api/v1/bookings/WWT-2025-12345
 *
 * Returns full booking details with all relations in a single query (no N+1!)
 */
export const GET = withErrorHandling<unknown, { id: string }>(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.public(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;

  // Get full booking details (single query with all relations)
  const booking = await bookingService.getFullBookingDetails(id);

  if (!booking) {
    return APIResponse.notFound('Booking', id);
  }

  return APIResponse.success(booking);
});

// ============================================================================
// PATCH /api/v1/bookings/:id - Update booking
// ============================================================================

const UpdateBookingSchema = z.object({
  customerName: z.string().min(1).max(255).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(10).max(20).optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationHours: z.number().min(4).max(24).optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  specialRequests: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
});

/**
 * Update booking (partial update)
 *
 * Body: Any subset of booking fields
 */
export const PATCH = withErrorHandling<unknown, { id: string }>(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;

  // Validate ID is numeric
  const bookingId = parseInt(id, 10);
  if (isNaN(bookingId)) {
    throw new BadRequestError('Booking ID must be numeric for updates', 'INVALID_ID');
  }

  // Validate request body
  const data = await validateRequest(UpdateBookingSchema, request);

  // Update booking
  const updatedBooking = await bookingService.updateBooking(bookingId, data);

  return APIResponse.success(updatedBooking, {
    message: 'Booking updated successfully',
  });
});

// ============================================================================
// DELETE /api/v1/bookings/:id - Cancel booking
// ============================================================================

const CancelBookingSchema = z.object({
  reason: z.string().optional(),
});

/**
 * Cancel booking
 *
 * Body (optional): {
 *   reason: string
 * }
 */
export const DELETE = withErrorHandling<unknown, { id: string }>(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;

  // Validate ID is numeric
  const bookingId = parseInt(id, 10);
  if (isNaN(bookingId)) {
    throw new BadRequestError('Booking ID must be numeric for cancellation', 'INVALID_ID');
  }

  // Parse body (optional reason)
  let reason: string | undefined;
  try {
    const body = await request.json();
    const validated = CancelBookingSchema.parse(body);
    reason = validated.reason;
  } catch {
    // No body is okay
  }

  // Cancel booking
  const cancelledBooking = await bookingService.cancelBooking(bookingId, reason);

  return APIResponse.success(cancelledBooking, {
    message: 'Booking cancelled successfully',
  });
});
