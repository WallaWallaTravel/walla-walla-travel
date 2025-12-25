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
import { validateRequest, ValidationError } from '@/lib/api/validate';
import { rateLimiters } from '@/lib/api/middleware';
import { bookingService } from '@/lib/services/booking.service';
import { ServiceError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

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
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.public(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;
  try {
    // Get full booking details (single query with all relations)
    const booking = await bookingService.getFullBookingDetails(id);

    if (!booking) {
      return APIResponse.notFound('Booking', id);
    }

    return APIResponse.success(booking);

  } catch (error) {
    if (error instanceof NotFoundError) {
      return APIResponse.notFound('Booking', id);
    }

    if (error instanceof ServiceError) {
      return APIResponse.error({
        code: error.code,
        message: error.message,
        details: error.details,
      }, 400);
    }

    return APIResponse.internalError(
      'Failed to fetch booking',
      error instanceof Error ? error.message : undefined
    );
  }
}

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
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;
  try {
    // Validate ID is numeric
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      return APIResponse.error({
        code: 'INVALID_ID',
        message: 'Booking ID must be numeric for updates',
      }, 400);
    }

    // Validate request body
    const data = await validateRequest(UpdateBookingSchema, request);

    // Update booking
    const updatedBooking = await bookingService.updateBooking(bookingId, data);

    return APIResponse.success(updatedBooking, {
      message: 'Booking updated successfully',
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return APIResponse.validation(error.errors);
    }

    if (error instanceof NotFoundError) {
      return APIResponse.notFound('Booking', id);
    }

    if (error instanceof ServiceError) {
      return APIResponse.error({
        code: error.code,
        message: error.message,
        details: error.details,
      }, 400);
    }

    return APIResponse.internalError(
      'Failed to update booking',
      error instanceof Error ? error.message : undefined
    );
  }
}

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
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;
  try {
    // Validate ID is numeric
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      return APIResponse.error({
        code: 'INVALID_ID',
        message: 'Booking ID must be numeric for cancellation',
      }, 400);
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

  } catch (error) {
    if (error instanceof NotFoundError) {
      return APIResponse.notFound('Booking', id);
    }

    if (error instanceof ServiceError) {
      return APIResponse.error({
        code: error.code,
        message: error.message,
        details: error.details,
      }, 400);
    }

    return APIResponse.internalError(
      'Failed to cancel booking',
      error instanceof Error ? error.message : undefined
    );
  }
}
