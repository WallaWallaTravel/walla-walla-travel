/**
 * Unified Bookings API - RESTful Endpoint
 * Consolidates 10+ old endpoints into one clean resource
 * 
 * GET    /api/v1/bookings - List bookings with filters
 * POST   /api/v1/bookings - Create new booking
 */

import { NextRequest } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest, ValidationError } from '@/lib/api/validate';
import { withMiddleware, rateLimiters } from '@/lib/api/middleware';
import { bookingService, CreateBookingSchema } from '@/lib/services/booking-service';
import { ServiceError } from '@/lib/api/middleware/error-handler';

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
export const GET = withMiddleware(
  async (request: NextRequest) => {
    try {
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

    } catch (error) {
      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      return APIResponse.internalError(
        'Failed to fetch bookings',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.authenticated
);

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
export const POST = withMiddleware(
  async (request: NextRequest) => {
    try {
      // Validate request body
      const data = await validateRequest(CreateBookingSchema, request);

      // Create booking via service
      const booking = await bookingService.createBooking(data);

      return APIResponse.success(booking, {
        bookingNumber: booking.booking_number,
        message: 'Booking created successfully',
      });

    } catch (error) {
      // Handle validation errors
      if (error instanceof ValidationError) {
        return APIResponse.validation(error.errors);
      }

      // Handle service errors
      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      // Handle unexpected errors
      return APIResponse.internalError(
        'Failed to create booking',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.public
);


