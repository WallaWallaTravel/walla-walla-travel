import { NextRequest } from 'next/server';
import {
  successResponse,
  requireAuth,
  logApiRequest,
  formatDateForDB
} from '@/app/api/utils';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('GET', '/api/workflow/hos', session.userId);

  const driverId = parseInt(session.userId);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || formatDateForDB(new Date());

  // Get Hours of Service compliance data
  // FMCSA Rules for passenger carriers:
  // - 10-hour driving limit
  // - 15-hour on-duty limit
  // - 60/70-hour limit in 7/8 days
  // - 8-hour break requirement
  // - 150-mile exemption (8 times per month)

  // Get daily hours
  const dailyHoursRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COALESCE(SUM(
        CASE
          WHEN DATE(clock_in_time) = ${date}
          THEN EXTRACT(EPOCH FROM (COALESCE(clock_out_time, CURRENT_TIMESTAMP) - clock_in_time)) / 3600
          ELSE 0
        END
      ), 0) as on_duty_hours,
      COALESCE(SUM(
        CASE
          WHEN DATE(clock_in_time) = ${date}
          THEN total_break_minutes / 60.0
          ELSE 0
        END
      ), 0) as break_hours
    FROM time_cards
    WHERE driver_id = ${driverId}
      AND DATE(clock_in_time) = ${date}
  `;

  const dailyHours = dailyHoursRows[0];

  // Get driving hours from daily trips
  const drivingHoursRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COALESCE(SUM(total_miles / 40.0), 0) as driving_hours,
      COALESCE(SUM(total_miles), 0) as total_miles
    FROM daily_trips
    WHERE driver_id = ${driverId} AND trip_date = ${date}
  `;

  const drivingData = drivingHoursRows[0];

  // Get 7-day and 8-day totals
  const weeklyHoursRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(clock_out_time, CURRENT_TIMESTAMP) - clock_in_time)) / 3600
      ), 0) as hours_7_day,
      COALESCE(SUM(
        CASE
          WHEN DATE(clock_in_time) >= CURRENT_DATE - INTERVAL '7 days'
          THEN EXTRACT(EPOCH FROM (COALESCE(clock_out_time, CURRENT_TIMESTAMP) - clock_in_time)) / 3600
          ELSE 0
        END
      ), 0) as hours_8_day
    FROM time_cards
    WHERE driver_id = ${driverId}
      AND clock_in_time >= CURRENT_DATE - INTERVAL '7 days'
  `;

  const weeklyHours = weeklyHoursRows[0];

  // Get consecutive days worked
  const consecutiveDaysRows = await prisma.$queryRaw<{ consecutive_days: bigint }[]>`
    SELECT COUNT(DISTINCT DATE(clock_in_time)) as consecutive_days
    FROM time_cards
    WHERE driver_id = ${driverId}
      AND clock_in_time >= CURRENT_DATE - INTERVAL '7 days'
  `;

  const consecutiveDays = Number(consecutiveDaysRows[0].consecutive_days);

  // Check 150-mile exemption eligibility and usage
  const exemptionRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      mes.*,
      (
        SELECT COUNT(*)
        FROM daily_trips dt
        WHERE dt.driver_id = ${driverId}
          AND dt.trip_date = ${date}
          AND dt.total_miles <= 150
          AND dt.used_exemption = true
      ) as used_today
    FROM monthly_exemption_status mes
    WHERE mes.driver_id = ${driverId}
      AND mes.month = date_trunc('month', ${date}::date)
  `;

  const exemption = exemptionRows[0] || {
    days_used: 0,
    days_available: 8,
    is_eligible: true,
    used_today: 0,
  };

  // Calculate violations and warnings
  const violations = [];
  const warnings = [];

  const drivingHoursNum = Number(drivingData.driving_hours);
  const onDutyHoursNum = Number(dailyHours.on_duty_hours);
  const breakHoursNum = Number(dailyHours.break_hours);
  const totalMiles = Number(drivingData.total_miles);

  // Check daily driving limit (10 hours)
  if (drivingHoursNum > 10) {
    violations.push({
      type: 'daily_driving',
      message: 'Exceeded 10-hour daily driving limit',
      hours: drivingHoursNum,
      limit: 10,
    });
  } else if (drivingHoursNum > 9) {
    warnings.push({
      type: 'daily_driving',
      message: 'Approaching 10-hour daily driving limit',
      hours: drivingHoursNum,
      limit: 10,
    });
  }

  // Check daily on-duty limit (15 hours)
  if (onDutyHoursNum > 15) {
    violations.push({
      type: 'daily_on_duty',
      message: 'Exceeded 15-hour daily on-duty limit',
      hours: onDutyHoursNum,
      limit: 15,
    });
  } else if (onDutyHoursNum > 14) {
    warnings.push({
      type: 'daily_on_duty',
      message: 'Approaching 15-hour daily on-duty limit',
      hours: onDutyHoursNum,
      limit: 15,
    });
  }

  // Check 60/70 hour limits
  const weeklyLimit = consecutiveDays > 7 ? 70 : 60;
  const weeklyHoursToCheck = Number(consecutiveDays > 7 ? weeklyHours.hours_8_day : weeklyHours.hours_7_day);

  if (weeklyHoursToCheck > weeklyLimit) {
    violations.push({
      type: 'weekly_hours',
      message: `Exceeded ${weeklyLimit}-hour limit in ${consecutiveDays > 7 ? 8 : 7} days`,
      hours: weeklyHoursToCheck,
      limit: weeklyLimit,
    });
  } else if (weeklyHoursToCheck > weeklyLimit - 5) {
    warnings.push({
      type: 'weekly_hours',
      message: `Approaching ${weeklyLimit}-hour limit in ${consecutiveDays > 7 ? 8 : 7} days`,
      hours: weeklyHoursToCheck,
      limit: weeklyLimit,
    });
  }

  // Check 8-hour break requirement
  if (onDutyHoursNum >= 8 && breakHoursNum < 0.5) {
    violations.push({
      type: 'break_requirement',
      message: 'Required 30-minute break not taken after 8 hours',
      break_minutes: breakHoursNum * 60,
      required: 30,
    });
  }

  // Check 150-mile exemption usage
  if ((exemption.days_used as number) >= 8) {
    warnings.push({
      type: 'exemption_limit',
      message: 'Monthly 150-mile exemption limit reached',
      days_used: exemption.days_used,
      limit: 8,
    });
  }

  // Prepare compliance summary
  const compliance = {
    date,
    is_compliant: violations.length === 0,
    violations,
    warnings,
    daily: {
      driving_hours: parseFloat(drivingHoursNum.toFixed(2)),
      on_duty_hours: parseFloat(onDutyHoursNum.toFixed(2)),
      break_hours: parseFloat(breakHoursNum.toFixed(2)),
      total_miles: totalMiles,
      remaining_drive_time: Math.max(0, 10 - drivingHoursNum),
      remaining_duty_time: Math.max(0, 15 - onDutyHoursNum),
    },
    weekly: {
      hours_7_day: parseFloat(Number(weeklyHours.hours_7_day).toFixed(2)),
      hours_8_day: parseFloat(Number(weeklyHours.hours_8_day).toFixed(2)),
      consecutive_days: consecutiveDays,
      weekly_limit: weeklyLimit,
      remaining_hours: Math.max(0, weeklyLimit - weeklyHoursToCheck),
    },
    exemption: {
      eligible_today: totalMiles <= 150 && (exemption.days_used as number) < 8,
      used_today: (exemption.used_today as number) > 0,
      days_used_this_month: exemption.days_used,
      days_remaining: Math.max(0, 8 - (exemption.days_used as number)),
    },
    next_required_break: onDutyHoursNum < 8
      ? `After ${(8 - onDutyHoursNum).toFixed(2)} more hours`
      : breakHoursNum >= 0.5 ? 'Break requirement met' : 'Break required now',
  };

  return successResponse(compliance, 'HOS compliance data retrieved');
});
