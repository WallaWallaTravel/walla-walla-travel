import { NextRequest } from 'next/server';
import {
  successResponse,
  requireAuth,
  logApiRequest,
  formatDateForDB
} from '@/app/api/utils';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async (_request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('GET', '/api/workflow/daily', session.userId);

  const driverId = parseInt(session.userId);
  const today = formatDateForDB(new Date());

  // Get today's time card (Pacific Time)
  const timeCardRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      tc.*,
      v.vehicle_number,
      v.make,
      v.model,
      0 as total_breaks,
      0 as total_break_time
    FROM time_cards tc
    LEFT JOIN vehicles v ON tc.vehicle_id = v.id
    WHERE tc.driver_id = ${driverId}
      AND DATE(tc.clock_in_time AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
    ORDER BY tc.clock_in_time DESC
    LIMIT 1
  `;

  const timeCard = timeCardRows[0] || null;

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
  const hosRows = await prisma.$queryRaw<Record<string, unknown>[]>`
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
    WHERE driver_id = ${driverId}
      AND clock_in_time >= NOW() - INTERVAL '7 days'
  `;

  const hos: Record<string, unknown> = hosRows[0] || {
    daily_on_duty: 0,
    weekly_hours: 0,
    consecutive_days: 0,
  };

  // Add driving hours from time cards (using on_duty_hours as driving time for now)
  const drivingRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COALESCE(SUM(
        CASE
          WHEN DATE(clock_in_time AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
          THEN on_duty_hours * 0.7 -- Estimate 70% of on-duty time is driving
          ELSE 0
        END
      ), 0) as daily_driving
    FROM time_cards
    WHERE driver_id = ${driverId}
      AND clock_in_time >= NOW() - INTERVAL '7 days'
  `;

  hos.daily_driving = drivingRows[0]?.daily_driving || 0;

  // Get today's breaks (table doesn't exist yet)
  const breaks: { id: number; break_start: string; break_end: string | null; break_type: string }[] = [];

  // Get today's scheduled routes
  const routesRows = await prisma.$queryRaw<Record<string, unknown>[]>`
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
    WHERE r.driver_id = ${driverId}
      AND r.route_date = ${today}
    ORDER BY r.start_time
  `;

  // Get 150-mile exemption status
  const exemptionRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM monthly_exemption_status
    WHERE driver_id = ${driverId}
      AND month = date_trunc('month', ${today}::date)
  `;

  const exemptionStatus = exemptionRows[0] || {
    days_used: 0,
    days_available: 8,
    is_eligible: true,
  };

  // Compile daily workflow data
  const dailyDriving = parseFloat(((hos.daily_driving as number) || 0).toFixed(2));
  const dailyOnDuty = parseFloat(((hos.daily_on_duty as number) || 0).toFixed(2));
  const weeklyHours = parseFloat(((hos.weekly_hours as number) || 0).toFixed(2));

  const dailyWorkflow = {
    date: today,
    status,
    timeCard,
    breaks,
    routes: routesRows,
    hos: {
      daily_driving: dailyDriving,
      daily_on_duty: dailyOnDuty,
      weekly_hours: weeklyHours,
      consecutive_days: hos.consecutive_days,
      remaining_drive_time: Math.max(0, 10 - dailyDriving), // 10-hour limit (passenger)
      remaining_duty_time: Math.max(0, 15 - dailyOnDuty), // 15-hour limit (passenger)
      requires_break: dailyOnDuty >= 8, // 8-hour break requirement
    },
    exemption: {
      using_today: (exemptionStatus.days_used as number) > 0,
      days_used_this_month: exemptionStatus.days_used,
      days_remaining: Math.max(0, 8 - (exemptionStatus.days_used as number)),
      is_eligible: exemptionStatus.is_eligible,
    },
  };

  return successResponse(dailyWorkflow, 'Daily workflow retrieved');
});
