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
 * Create a new shared tour date
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

  // Validate day of week (Sun-Wed only)
  const date = new Date(body.tour_date);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed
  if (dayOfWeek > 3) {
    return NextResponse.json(
      { success: false, error: 'Shared tours can only be scheduled on Sunday through Wednesday' },
      { status: 400 }
    );
  }

  const tour = await sharedTourService.createTour({
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
  });

  return NextResponse.json({
    success: true,
    data: tour,
    message: 'Shared tour created successfully',
  });
})));
