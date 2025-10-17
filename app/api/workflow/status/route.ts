import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  requireAuth,
  parseRequestBody,
  logApiRequest
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

    logApiRequest('GET', '/api/workflow/status', session.userId);

    const driverId = parseInt(session.userId);

    // Get current driver status from multiple sources
    const statusQuery = await query(`
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
          WHERE driver_id = $1 
            AND route_date = CURRENT_DATE 
            AND status = 'scheduled'
        ) as routes_remaining,
        (
          SELECT COUNT(*) 
          FROM routes 
          WHERE driver_id = $1 
            AND route_date = CURRENT_DATE 
            AND status = 'completed'
        ) as routes_completed
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      LEFT JOIN routes r ON tc.current_route_id = r.id
      LEFT JOIN break_records br ON br.time_card_id = tc.id AND br.break_end IS NULL
      WHERE tc.driver_id = $1 
        AND DATE(tc.clock_in_time) = CURRENT_DATE
        AND tc.clock_out_time IS NULL
      LIMIT 1
    `, [driverId]);

    if (statusQuery.rowCount === 0) {
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

    const currentStatus = statusQuery.rows[0];
    
    // Calculate today's totals
    const totalsQuery = await query(`
      SELECT 
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(clock_out_time, CURRENT_TIMESTAMP) - clock_in_time)) / 3600
        ), 0) as total_hours,
        COALESCE(SUM(end_mileage - start_mileage), 0) as total_miles
      FROM time_cards
      WHERE driver_id = $1 
        AND DATE(clock_in_time) = CURRENT_DATE
    `, [driverId]);

    const totals = totalsQuery.rows[0];

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
        total_hours: parseFloat(totals.total_hours.toFixed(2)),
        total_miles: totals.total_miles || 0,
      }
    };

    return successResponse(response, 'Current status retrieved');

  } catch (error) {
    console.error('Get status error:', error);
    return errorResponse('Failed to retrieve status', 500);
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
    const timeCardResult = await query(`
      SELECT * FROM time_cards 
      WHERE driver_id = $1 
        AND DATE(clock_in_time) = CURRENT_DATE
        AND clock_out_time IS NULL
    `, [driverId]);

    if (timeCardResult.rowCount === 0) {
      return errorResponse('No active time card. Please clock in first.', 400);
    }

    const timeCard = timeCardResult.rows[0];

    // Update time card status
    const result = await query(`
      UPDATE time_cards 
      SET 
        status = $2,
        notes = CASE WHEN $3 IS NOT NULL THEN $3 ELSE notes END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [timeCard.id, body.status, body.notes || null]);

    // Log status change for HOS tracking
    await query(`
      INSERT INTO driver_status_logs (
        driver_id,
        time_card_id,
        status,
        change_time,
        notes
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
    `, [driverId, timeCard.id, body.status, body.notes || null]);

    return successResponse(result.rows[0], 'Status updated successfully');

  } catch (error) {
    console.error('Update status error:', error);
    return errorResponse('Failed to update status', 500);
  }
}

// Helper function to get route count by status
async function getRoutesCount(driverId: number, status: string): Promise<number> {
  const result = await query(`
    SELECT COUNT(*) as count
    FROM routes
    WHERE driver_id = $1 
      AND route_date = CURRENT_DATE 
      AND status = $2
  `, [driverId, status]);
  
  return parseInt(result.rows[0].count);
}