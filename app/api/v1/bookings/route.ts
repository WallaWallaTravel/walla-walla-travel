/**
 * Unified Bookings API - RESTful Endpoint
 * Consolidates 10+ old endpoints into one clean resource
 *
 * GET    /api/v1/bookings - List bookings with filters
 * POST   /api/v1/bookings - Create new booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest } from '@/lib/api/validate';
import { rateLimiters } from '@/lib/api/middleware';
import { bookingService, CreateBookingSchema } from '@/lib/services/booking.service';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

// ============================================================================
// GET /api/v1/bookings - List bookings with filters
// ============================================================================

/**
 * List bookings with optional filters
 *
 * Query Params:
 * - year: Filter by year (e.g., 2025)
 * - month: Filter by month (1-12)
 * - status: Filter by status (pending, confirmed, completed, cancelled)
 * - customer_id: Filter by customer ID
 * - brand_id: Filter by brand ID
 * - include: Comma-separated relations (wineries, driver, vehicle)
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 *
 * Examples:
 * - /api/v1/bookings?year=2025&month=11
 * - /api/v1/bookings?status=confirmed&include=wineries,driver
 * - /api/v1/bookings?customer_id=123&limit=10
 */
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);

  // Parse filters
  const filters = {
    year: searchParams.get('year') || undefined,
    month: searchParams.get('month') || undefined,
    status: searchParams.get('status') || undefined,
    customerId: searchParams.get('customer_id')
      ? parseInt(searchParams.get('customer_id')!, 10)
      : undefined,
    brandId: searchParams.get('brand_id')
      ? parseInt(searchParams.get('brand_id')!, 10)
      : undefined,
    includeWineries: searchParams.get('include')?.includes('wineries'),
    includeDriver: searchParams.get('include')?.includes('driver'),
    includeVehicle: searchParams.get('include')?.includes('vehicle'),
    limit: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50,
    offset: searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : 0,
  };

  // Get bookings from service (single query, no N+1!)
  const result = await bookingService.findManyWithFilters(filters);

  return APIResponse.success(result.bookings, {
    total: result.total,
    limit: filters.limit,
    offset: filters.offset,
    page: Math.floor(filters.offset / filters.limit) + 1,
    pages: Math.ceil(result.total / filters.limit),
  });
});

// ============================================================================
// POST /api/v1/bookings - Create new booking
// ============================================================================

/**
 * Create a new booking
 *
 * Body: {
 *   customerName: string,
 *   customerEmail: string,
 *   customerPhone: string,
 *   partySize: number (1-50),
 *   tourDate: string (YYYY-MM-DD),
 *   startTime: string (HH:MM),
 *   durationHours: number (4-24),
 *   totalPrice: number,
 *   depositPaid: number,
 *   brandId?: number
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.public(request);
  if (rateLimitResult) return rateLimitResult;

  // Validate request body
  const data = await validateRequest(CreateBookingSchema, request);

  // Create booking via service
  const booking = await bookingService.createBooking(data);

  return APIResponse.success(booking, {
    bookingNumber: booking.booking_number,
    message: 'Booking created successfully',
  });
});
