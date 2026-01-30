import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

/**
 * GET /api/time-clock/today?driverId=X
 * Returns today's status for a specific driver
 *
 * ✅ REFACTORED: withErrorHandling middleware
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  if (!driverId) {
    throw new BadRequestError('Driver ID is required');
  }

  // Get today's time card
  const timeCardResult = await query(
    `SELECT
      tc.*,
      u.name as driver_name,
      v.vehicle_number,
      v.make,
      v.model,
      -- Calculate hours worked so far
      CASE
        WHEN tc.clock_out_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (tc.clock_out_time - tc.clock_in_time)) / 3600
        ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tc.clock_in_time)) / 3600
      END as hours_worked,
      -- Calculate driving hours (when not on break)
      CASE
        WHEN tc.clock_out_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (tc.clock_out_time - tc.clock_in_time)) / 3600
        ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tc.clock_in_time)) / 3600
      END as driving_hours
    FROM time_cards tc
    JOIN users u ON tc.driver_id = u.id
    LEFT JOIN vehicles v ON tc.vehicle_id = v.id
    WHERE tc.driver_id = $1
    AND tc.clock_in_time::date = CURRENT_DATE
    ORDER BY tc.clock_in_time DESC
    LIMIT 1`,
    [driverId]
  );

  // Get today's trip (distance tracking)
  const tripResult = await query(
    `SELECT * FROM daily_trips
    WHERE driver_id = $1
    AND date = CURRENT_DATE
    LIMIT 1`,
    [driverId]
  );

  // Get weekly hours
  const weeklyResult = await query(
    `SELECT
      COALESCE(SUM(on_duty_hours), 0) as weekly_hours
    FROM time_cards
    WHERE driver_id = $1
    AND clock_in_time >= DATE_TRUNC('week', CURRENT_DATE)
    AND clock_in_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'`,
    [driverId]
  );

  // Get inspection status
  const inspectionResult = await query(
    `SELECT
      type,
      status,
      created_at
    FROM inspections
    WHERE driver_id = $1
    AND created_at::date = CURRENT_DATE
    ORDER BY created_at DESC`,
    [driverId]
  );

  const timeCard = timeCardResult.rows[0] || null;
  const trip = tripResult.rows[0] || null;
  const weeklyHours = parseFloat(weeklyResult.rows[0]?.weekly_hours || '0');
  const inspections = inspectionResult.rows;

  // Determine status
  const isClockedIn = timeCard && !timeCard.clock_out_time;
  const hasPreTrip = inspections.some((i: { type: string; status: string }) => i.type === 'pre_trip' && i.status === 'complete');
  const hasPostTrip = inspections.some((i: { type: string; status: string }) => i.type === 'post_trip' && i.status === 'complete');

  // Calculate compliance alerts
  const alerts = [];

  if (timeCard?.hours_worked >= 9.5) {
    alerts.push({
      type: 'warning',
      message: 'Approaching 10-hour driving limit',
      severity: 'high'
    });
  }

  if (timeCard?.hours_worked >= 14) {
    alerts.push({
      type: 'error',
      message: 'Approaching 15-hour on-duty limit',
      severity: 'critical'
    });
  }

  if (weeklyHours >= 55) {
    alerts.push({
      type: 'warning',
      message: 'Approaching 60-hour weekly limit',
      severity: 'medium'
    });
  }

  if (trip?.max_air_miles >= 140) {
    alerts.push({
      type: 'warning',
      message: 'Approaching 150-mile exemption limit',
      severity: 'medium'
    });
  }

  return NextResponse.json({
    success: true,
    status: {
      isClockedIn,
      hasPreTrip,
      hasPostTrip,
      timeCard,
      trip,
      weeklyHours,
      inspections,
      alerts
    }
  });
});
