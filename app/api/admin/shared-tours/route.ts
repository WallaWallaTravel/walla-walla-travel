import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * GET /api/admin/shared-tours
 * Get all shared tours (including unpublished)
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let tours;
  if (startDate && endDate) {
    tours = await sharedTourService.getToursInRange(startDate, endDate);
  } else {
    tours = await sharedTourService.getUpcomingTours();
  }

  return NextResponse.json({
    success: true,
    data: tours,
    count: tours.length,
  });
});

/**
 * POST /api/admin/shared-tours
 * Create a new shared tour date with automatic vehicle assignment
 *
 * Vehicle Assignment Behavior:
 * - By default, auto-assigns the best available vehicle
 * - If vehicle_id provided, uses that specific vehicle (validates availability)
 * - If no vehicles available, returns 409 Conflict error
 * - max_guests is automatically capped to vehicle capacity
 *
 * Optional flags:
 * - auto_assign_vehicle: false to disable auto-assignment (requires vehicle_id)
 * - require_vehicle: false to allow tour creation without vehicle (not recommended)
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session: AuthSession) => {
  const body = await request.json();

  // Validate required fields
  if (!body.tour_date) {
    return NextResponse.json(
      { success: false, error: 'tour_date is required' },
      { status: 400 }
    );
  }

  // Note: Day-of-week validation removed - any day is now allowed
  // Sun-Wed is still recommended (peak days), but Thu-Sat tours are permitted

  try {
    const result = await sharedTourService.createTour({
      tour_date: body.tour_date,
      start_time: body.start_time,
      duration_hours: body.duration_hours,
      max_guests: body.max_guests,
      min_guests: body.min_guests,
      base_price_per_person: body.base_price_per_person,
      lunch_price_per_person: body.lunch_price_per_person,
      lunch_included_default: body.lunch_included_default,
      title: body.title,
      description: body.description,
      meeting_location: body.meeting_location,
      wineries_preview: body.wineries_preview,
      booking_cutoff_hours: body.booking_cutoff_hours,
      is_published: body.is_published,
      notes: body.notes,
      vehicle_id: body.vehicle_id,
      driver_id: body.driver_id,
      auto_assign_vehicle: body.auto_assign_vehicle,
      require_vehicle: body.require_vehicle,
    });

    // Build response message
    let message = 'Shared tour created successfully';
    if (result.vehicle_assigned && result.vehicle_info) {
      message += `. Vehicle assigned: ${result.vehicle_info.name} (capacity: ${result.vehicle_info.capacity})`;
    }
    if (result.max_guests_locked_to_capacity) {
      message += `. Note: max_guests was reduced to ${result.tour.max_guests} to match vehicle capacity`;
    }

    return NextResponse.json({
      success: true,
      data: result.tour,
      vehicle_info: result.vehicle_info,
      vehicle_assigned: result.vehicle_assigned,
      max_guests_locked_to_capacity: result.max_guests_locked_to_capacity,
      message,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create tour';

    // Return 409 Conflict for vehicle availability issues
    if (errorMessage.includes('No vehicles available') || errorMessage.includes('not available')) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 409 }
      );
    }

    // Return 400 for validation errors
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
})));
