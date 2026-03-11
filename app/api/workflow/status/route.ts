import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
  parseRequestBody,
  logApiRequest
} from '@/app/api/utils';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async (_request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('GET', '/api/workflow/status', session.userId);

  const driverId = parseInt(session.userId);

  // Get current driver status from multiple sources
  const statusRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      tc.id as time_card_id,
      tc.clock_in_time,
      tc.clock_out_time,
      tc.status as time_card_status,
      tc.vehicle_id,
      v.vehicle_number,
      r.id as current_route_id,
      r.route_name as current_route,
      br.id as break_id,
      br.break_start,
      br.break_type,
      (
        SELECT COUNT(*)
        FROM routes
        WHERE driver_id = ${driverId}
          AND route_date = CURRENT_DATE
          AND status = 'scheduled'
      ) as routes_remaining,
      (
        SELECT COUNT(*)
        FROM routes
        WHERE driver_id = ${driverId}
          AND route_date = CURRENT_DATE
          AND status = 'completed'
      ) as routes_completed
    FROM time_cards tc
    LEFT JOIN vehicles v ON tc.vehicle_id = v.id
    LEFT JOIN routes r ON tc.current_route_id = r.id
    LEFT JOIN break_records br ON br.time_card_id = tc.id AND br.break_end IS NULL
    WHERE tc.driver_id = ${driverId}
      AND DATE(tc.clock_in_time) = CURRENT_DATE
      AND tc.clock_out_time IS NULL
    LIMIT 1
  `;

  if (statusRows.length === 0) {
    // Driver not clocked in
    return successResponse({
      status: 'off_duty',
      clocked_in: false,
      on_break: false,
      current_vehicle: null,
      current_route: null,
      today_summary: {
        routes_completed: 0,
        routes_remaining: await getRoutesCount(driverId, 'scheduled'),
        total_hours: 0,
        total_miles: 0,
      }
    }, 'Driver is currently off duty');
  }

  const currentStatus = statusRows[0];

  // Calculate today's totals
  const totalsRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(clock_out_time, CURRENT_TIMESTAMP) - clock_in_time)) / 3600
      ), 0) as total_hours,
      COALESCE(SUM(end_mileage - start_mileage), 0) as total_miles
    FROM time_cards
    WHERE driver_id = ${driverId}
      AND DATE(clock_in_time) = CURRENT_DATE
  `;

  const totals = totalsRows[0];

  // Determine actual status
  let driverStatus = 'on_duty';
  if (currentStatus.clock_out_time) {
    driverStatus = 'off_duty';
  } else if (currentStatus.break_id) {
    driverStatus = 'on_break';
  } else if (currentStatus.current_route_id) {
    driverStatus = 'driving';
  }

  const response = {
    status: driverStatus,
    clocked_in: true,
    on_break: !!currentStatus.break_id,
    clock_in_time: currentStatus.clock_in_time,
    current_vehicle: currentStatus.vehicle_number ? {
      id: currentStatus.vehicle_id,
      vehicle_number: currentStatus.vehicle_number,
    } : null,
    current_route: currentStatus.current_route ? {
      id: currentStatus.current_route_id,
      name: currentStatus.current_route,
    } : null,
    current_break: currentStatus.break_id ? {
      id: currentStatus.break_id,
      start_time: currentStatus.break_start,
      type: currentStatus.break_type,
    } : null,
    today_summary: {
      routes_completed: currentStatus.routes_completed || 0,
      routes_remaining: currentStatus.routes_remaining || 0,
      total_hours: parseFloat(Number(totals.total_hours).toFixed(2)),
      total_miles: totals.total_miles || 0,
    }
  };

  return successResponse(response, 'Current status retrieved');
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('PUT', '/api/workflow/status', session.userId);

  // Parse request body
  const body = await parseRequestBody<{
    status: 'on_duty' | 'driving' | 'on_break' | 'off_duty';
    notes?: string;
  }>(request);

  if (!body || !body.status) {
    return errorResponse('Status is required', 400);
  }

  const driverId = parseInt(session.userId);

  // Get current time card
  const timeCardRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM time_cards
    WHERE driver_id = ${driverId}
      AND DATE(clock_in_time) = CURRENT_DATE
      AND clock_out_time IS NULL
  `;

  if (timeCardRows.length === 0) {
    return errorResponse('No active time card. Please clock in first.', 400);
  }

  const timeCard = timeCardRows[0];

  // Update time card status
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE time_cards
    SET
      status = ${body.status},
      notes = CASE WHEN ${body.notes || null} IS NOT NULL THEN ${body.notes || null} ELSE notes END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${timeCard.id as number}
    RETURNING *
  `;

  // Log status change for HOS tracking
  await prisma.$executeRaw`
    INSERT INTO driver_status_logs (
      driver_id,
      time_card_id,
      status,
      change_time,
      notes
    ) VALUES (${driverId}, ${timeCard.id as number}, ${body.status}, CURRENT_TIMESTAMP, ${body.notes || null})
  `;

  return successResponse(rows[0], 'Status updated successfully');
});

// Helper function to get route count by status
async function getRoutesCount(driverId: number, status: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM routes
    WHERE driver_id = ${driverId}
      AND route_date = CURRENT_DATE
      AND status = ${status}
  `;

  return Number(rows[0].count);
}
