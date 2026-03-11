import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
  logApiRequest,
  formatDateForDB,
  isValidDate,
  getPaginationParams,
  buildPaginationMeta,
  parseRequestBody
} from '@/app/api/utils';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('GET', '/api/workflow/schedule', session.userId);

  const driverId = parseInt(session.userId);
  const { searchParams } = new URL(request.url);

  // Get date range parameters
  let startDate = searchParams.get('startDate');
  let endDate = searchParams.get('endDate');
  const days = parseInt(searchParams.get('days') || '7', 10);

  // If no dates provided, use default range (today + X days)
  if (!startDate) {
    startDate = formatDateForDB(new Date());
  }
  if (!endDate) {
    const end = new Date();
    end.setDate(end.getDate() + days);
    endDate = formatDateForDB(end);
  }

  // Validate dates
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return errorResponse('Invalid date format', 400);
  }

  // Get pagination parameters
  const pagination = getPaginationParams(request);

  // Get total count for pagination
  const countRows = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) as total
    FROM routes
    WHERE driver_id = ${driverId}
      AND route_date BETWEEN ${startDate} AND ${endDate}
  `;

  const total = Number(countRows[0].total);

  // Get scheduled routes with vehicle and passenger details
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      r.id,
      r.route_date as date,
      r.route_name,
      r.start_time,
      r.end_time,
      r.pickup_location,
      r.dropoff_location,
      r.passenger_count,
      r.special_instructions,
      r.status,
      v.id as vehicle_id,
      v.vehicle_number,
      v.make,
      v.model,
      v.capacity,
      (
        SELECT COUNT(*)
        FROM client_notes cn
        WHERE cn.route_id = r.id
      ) as client_stops,
      (
        SELECT COALESCE(SUM(total_miles), 0)
        FROM daily_trips dt
        WHERE dt.driver_id = r.driver_id
          AND dt.trip_date = r.route_date
      ) as estimated_miles
    FROM routes r
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
    WHERE r.driver_id = ${driverId}
      AND r.route_date BETWEEN ${startDate} AND ${endDate}
    ORDER BY r.route_date, r.start_time
    LIMIT ${pagination.limit} OFFSET ${pagination.offset}
  `;

  // Group by date for better organization
  const scheduleByDate: Record<string, typeof rows> = {};
  rows.forEach(route => {
    const date = route.date as string;
    if (!scheduleByDate[date]) {
      scheduleByDate[date] = [];
    }
    scheduleByDate[date].push(route);
  });

  // Get driver's availability/time-off for the period
  const timeOffRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      date,
      reason,
      is_available
    FROM driver_availability
    WHERE driver_id = ${driverId}
      AND date BETWEEN ${startDate} AND ${endDate}
  `;

  const timeOff = timeOffRows.reduce((acc: Record<string, { available: boolean; reason: string }>, row) => {
    acc[row.date as string] = {
      available: row.is_available as boolean,
      reason: row.reason as string
    };
    return acc;
  }, {});

  // Calculate summary statistics
  const summaryRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COUNT(DISTINCT route_date) as total_days,
      COUNT(*) as total_routes,
      COALESCE(SUM(passenger_count), 0) as total_passengers,
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
      ), 0) as avg_route_hours
    FROM routes
    WHERE driver_id = ${driverId}
      AND route_date BETWEEN ${startDate} AND ${endDate}
  `;

  const summary = summaryRows[0] || {
    total_days: 0,
    total_routes: 0,
    total_passengers: 0,
    avg_route_hours: 0,
  };

  // Build pagination metadata
  const paginationMeta = buildPaginationMeta(pagination, total);

  // Prepare response
  const scheduleData = {
    date_range: {
      start: startDate,
      end: endDate,
    },
    schedule: scheduleByDate,
    time_off: timeOff,
    summary: {
      total_working_days: summary.total_days,
      total_routes: summary.total_routes,
      total_passengers: summary.total_passengers,
      avg_daily_hours: parseFloat(Number(summary.avg_route_hours).toFixed(2)),
    },
    pagination: paginationMeta,
  };

  return successResponse(scheduleData, 'Schedule retrieved successfully');
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('PUT', '/api/workflow/schedule', session.userId);

  // Parse request body
  const body = await parseRequestBody<{
    routeId: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
  }>(request);

  if (!body) {
    return errorResponse('Invalid request body', 400);
  }

  if (!body.routeId || !body.status) {
    return errorResponse('Route ID and status are required', 400);
  }

  const driverId = parseInt(session.userId);

  // Verify the route belongs to this driver
  const routeCheckRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM routes
    WHERE id = ${body.routeId} AND driver_id = ${driverId}
  `;

  if (routeCheckRows.length === 0) {
    return errorResponse('Route not found or access denied', 404);
  }

  // Update route status
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE routes
    SET
      status = ${body.status},
      notes = CASE WHEN ${body.notes || null} IS NOT NULL THEN ${body.notes || null} ELSE notes END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${body.routeId}
    RETURNING *
  `;

  // If marking as in_progress, update time card
  if (body.status === 'in_progress') {
    await prisma.$executeRaw`
      UPDATE time_cards
      SET
        current_route_id = ${body.routeId},
        updated_at = CURRENT_TIMESTAMP
      WHERE driver_id = ${driverId}
        AND DATE(clock_in_time) = CURRENT_DATE
        AND clock_out_time IS NULL
    `;
  }

  // If marking as completed, clear current route
  if (body.status === 'completed') {
    await prisma.$executeRaw`
      UPDATE time_cards
      SET
        current_route_id = NULL,
        routes_completed = COALESCE(routes_completed, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE driver_id = ${driverId}
        AND DATE(clock_in_time) = CURRENT_DATE
        AND clock_out_time IS NULL
    `;
  }

  return successResponse(rows[0], 'Route status updated successfully');
});
