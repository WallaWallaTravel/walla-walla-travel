import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
  successResponse,
  errorResponse,
  requireAuth,
  logApiRequest,
  formatDateForDB
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

    logApiRequest('GET', '/api/workflow/daily', session.userId);

    const driverId = parseInt(session.userId);
    const today = formatDateForDB(new Date());

    // Get today's time card (Pacific Time)
    const timeCardResult = await query(`
      SELECT 
        tc.*,
        v.vehicle_number,
        v.make,
        v.model,
        0 as total_breaks,
        0 as total_break_time
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.driver_id = $1 
        AND DATE(tc.clock_in_time AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
      ORDER BY tc.clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    const timeCard = timeCardResult.rows[0] || null;

    // Determine workflow status
    let status = 'not_started';
    if (timeCard) {
      if (timeCard.clock_out_time) {
        status = 'completed';
      } else {
        // For now, assume on duty (no break records table yet)
        status = 'on_duty';
      }
    }

    // Get hours of service compliance data (8-day rolling window)
    const hosResult = await query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN DATE(clock_in_time AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
            THEN calculate_hos_hours(clock_in_time, COALESCE(clock_out_time, NOW()))
            ELSE 0 
          END
        ), 0) as daily_on_duty,
        COALESCE(SUM(
          CASE 
            WHEN clock_in_time >= NOW() - INTERVAL '7 days'
            THEN calculate_hos_hours(clock_in_time, COALESCE(clock_out_time, NOW()))
            ELSE 0 
          END
        ), 0) as weekly_hours,
        COUNT(DISTINCT DATE(clock_in_time AT TIME ZONE 'America/Los_Angeles')) FILTER (
          WHERE clock_in_time >= NOW() - INTERVAL '7 days'
        ) as consecutive_days
      FROM time_cards
      WHERE driver_id = $1
        AND clock_in_time >= NOW() - INTERVAL '7 days'
    `, [driverId]);

    const hos = hosResult.rows[0] || {
      daily_on_duty: 0,
      weekly_hours: 0,
      consecutive_days: 0,
    };

    // Add driving hours from time cards (using on_duty_hours as driving time for now)
    // In a real system, this would track actual driving vs on-duty time separately
    const drivingResult = await query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN DATE(clock_in_time AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
            THEN on_duty_hours * 0.7 -- Estimate 70% of on-duty time is driving
            ELSE 0 
          END
        ), 0) as daily_driving
      FROM time_cards
      WHERE driver_id = $1
        AND clock_in_time >= NOW() - INTERVAL '7 days'
    `, [driverId]);

    hos.daily_driving = drivingResult.rows[0]?.daily_driving || 0;

    // Get today's breaks (table doesn't exist yet)
    const breaks: { id: number; break_start: string; break_end: string | null; break_type: string }[] = [];

    // Get today's scheduled routes
    const routesResult = await query(`
      SELECT 
        r.id,
        r.route_name,
        r.start_time,
        r.end_time,
        r.pickup_location,
        r.passenger_count,
        v.vehicle_number
      FROM routes r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.driver_id = $1 
        AND r.route_date = $2
      ORDER BY r.start_time
    `, [driverId, today]);

    // Get 150-mile exemption status
    const exemptionResult = await query(`
      SELECT * FROM monthly_exemption_status
      WHERE driver_id = $1 
        AND month = date_trunc('month', $2::date)
    `, [driverId, today]);

    const exemptionStatus = exemptionResult.rows[0] || {
      days_used: 0,
      days_available: 8,
      is_eligible: true,
    };

    // Compile daily workflow data
    const dailyWorkflow = {
      date: today,
      status,
      timeCard,
      breaks,
      routes: routesResult.rows,
      hos: {
        daily_driving: parseFloat(hos.daily_driving.toFixed(2)),
        daily_on_duty: parseFloat(hos.daily_on_duty.toFixed(2)),
        weekly_hours: parseFloat(hos.weekly_hours.toFixed(2)),
        consecutive_days: hos.consecutive_days,
        remaining_drive_time: Math.max(0, 10 - parseFloat(hos.daily_driving.toFixed(2))), // 10-hour limit (passenger)
        remaining_duty_time: Math.max(0, 15 - parseFloat(hos.daily_on_duty.toFixed(2))), // 15-hour limit (passenger)
        requires_break: parseFloat(hos.daily_on_duty.toFixed(2)) >= 8, // 8-hour break requirement
      },
      exemption: {
        using_today: exemptionStatus.days_used > 0,
        days_used_this_month: exemptionStatus.days_used,
        days_remaining: Math.max(0, 8 - exemptionStatus.days_used),
        is_eligible: exemptionStatus.is_eligible,
      },
    };

    return successResponse(dailyWorkflow, 'Daily workflow retrieved');

  } catch (error) {
    logger.error('Get daily workflow error', { error });
    return errorResponse('Failed to retrieve daily workflow', 500);
  }
}