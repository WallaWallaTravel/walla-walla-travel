import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
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
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

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
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM routes
      WHERE driver_id = $1 
        AND route_date BETWEEN $2 AND $3
    `, [driverId, startDate, endDate]);

    const total = parseInt(countResult.rows[0].total);

    // Get scheduled routes with vehicle and passenger details
    const result = await query(`
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
      WHERE r.driver_id = $1 
        AND r.route_date BETWEEN $2 AND $3
      ORDER BY r.route_date, r.start_time
      LIMIT $4 OFFSET $5
    `, [driverId, startDate, endDate, pagination.limit, pagination.offset]);

    // Group by date for better organization
    const scheduleByDate: Record<string, any[]> = {};
    result.rows.forEach(route => {
      const date = route.date;
      if (!scheduleByDate[date]) {
        scheduleByDate[date] = [];
      }
      scheduleByDate[date].push(route);
    });

    // Get driver's availability/time-off for the period
    const timeOffResult = await query(`
      SELECT 
        date,
        reason,
        is_available
      FROM driver_availability
      WHERE driver_id = $1 
        AND date BETWEEN $2 AND $3
    `, [driverId, startDate, endDate]);

    const timeOff = timeOffResult.rows.reduce((acc: Record<string, any>, row) => {
      acc[row.date] = {
        available: row.is_available,
        reason: row.reason
      };
      return acc;
    }, {});

    // Calculate summary statistics
    const summaryResult = await query(`
      SELECT 
        COUNT(DISTINCT route_date) as total_days,
        COUNT(*) as total_routes,
        COALESCE(SUM(passenger_count), 0) as total_passengers,
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
        ), 0) as avg_route_hours
      FROM routes
      WHERE driver_id = $1 
        AND route_date BETWEEN $2 AND $3
    `, [driverId, startDate, endDate]);

    const summary = summaryResult.rows[0] || {
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
        avg_daily_hours: parseFloat(summary.avg_route_hours.toFixed(2)),
      },
      pagination: paginationMeta,
    };

    return successResponse(scheduleData, 'Schedule retrieved successfully');

  } catch (error) {
    logger.error('Get schedule error', { error });
    return errorResponse('Failed to retrieve schedule', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

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
    const routeCheck = await query(`
      SELECT * FROM routes 
      WHERE id = $1 AND driver_id = $2
    `, [body.routeId, driverId]);

    if (routeCheck.rowCount === 0) {
      return errorResponse('Route not found or access denied', 404);
    }

    // Update route status
    const result = await query(`
      UPDATE routes 
      SET 
        status = $2,
        notes = CASE WHEN $3 IS NOT NULL THEN $3 ELSE notes END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [body.routeId, body.status, body.notes || null]);

    // If marking as in_progress, update time card
    if (body.status === 'in_progress') {
      await query(`
        UPDATE time_cards 
        SET 
          current_route_id = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $2 
          AND DATE(clock_in_time) = CURRENT_DATE
          AND clock_out_time IS NULL
      `, [body.routeId, driverId]);
    }

    // If marking as completed, clear current route
    if (body.status === 'completed') {
      await query(`
        UPDATE time_cards 
        SET 
          current_route_id = NULL,
          routes_completed = COALESCE(routes_completed, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $1 
          AND DATE(clock_in_time) = CURRENT_DATE
          AND clock_out_time IS NULL
      `, [driverId]);
    }

    return successResponse(result.rows[0], 'Route status updated successfully');

  } catch (error) {
    logger.error('Update schedule error', { error });
    return errorResponse('Failed to update route status', 500);
  }
}