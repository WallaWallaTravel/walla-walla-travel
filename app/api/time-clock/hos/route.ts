import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/time-clock/hos?driverId=X
 * Returns HOS (Hours of Service) compliance data for a driver
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Get today's hours
    const todayResult = await query(
      `SELECT 
        COALESCE(
          CASE 
            WHEN clock_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600
            ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - clock_in_time)) / 3600
          END, 
          0
        ) as hours_today
      FROM time_cards
      WHERE driver_id = $1
      AND clock_in_time::date = CURRENT_DATE`,
      [driverId]
    );

    const hoursToday = parseFloat(todayResult.rows[0]?.hours_today || '0');

    // Get this week's hours (starting Sunday)
    const weeklyResult = await query(
      `SELECT 
        COALESCE(SUM(total_hours_worked), 0) as weekly_hours,
        COUNT(*) as days_worked_this_week
      FROM time_cards
      WHERE driver_id = $1
      AND clock_in_time >= DATE_TRUNC('week', CURRENT_DATE)
      AND clock_in_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'`,
      [driverId]
    );

    const weeklyHours = parseFloat(weeklyResult.rows[0]?.weekly_hours || '0');
    const daysWorkedThisWeek = parseInt(weeklyResult.rows[0]?.days_worked_this_week || '0');

    // Get last 8 days for 70-hour rule
    const eightDayResult = await query(
      `SELECT 
        COALESCE(SUM(total_hours_worked), 0) as eight_day_hours,
        COUNT(*) as days_worked_last_8
      FROM time_cards
      WHERE driver_id = $1
      AND clock_in_time >= CURRENT_DATE - INTERVAL '7 days'
      AND clock_in_time <= CURRENT_DATE`,
      [driverId]
    );

    const eightDayHours = parseFloat(eightDayResult.rows[0]?.eight_day_hours || '0');
    const daysWorkedLast8 = parseInt(eightDayResult.rows[0]?.days_worked_last_8 || '0');

    // Get 150-mile exemption status
    const exemptionResult = await query(
      `SELECT 
        mes.*,
        dt.air_miles_from_base as today_miles
      FROM monthly_exemption_status mes
      LEFT JOIN daily_trips dt ON dt.driver_id = mes.driver_id AND dt.trip_date = CURRENT_DATE
      WHERE mes.driver_id = $1
      AND mes.month = DATE_TRUNC('month', CURRENT_DATE)`,
      [driverId]
    );

    const exemptionStatus = exemptionResult.rows[0] || {
      is_exempt: true,
      days_exceeded_this_month: 0,
      today_miles: 0
    };

    // Get daily breakdown for last 7 days
    const dailyBreakdownResult = await query(
      `SELECT 
        clock_in_time::date as date,
        total_hours_worked as hours,
        COALESCE(dt.air_miles_from_base, 0) as miles
      FROM time_cards tc
      LEFT JOIN daily_trips dt ON tc.driver_id = dt.driver_id AND tc.clock_in_time::date = dt.trip_date
      WHERE tc.driver_id = $1
      AND tc.clock_in_time >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY clock_in_time::date DESC`,
      [driverId]
    );

    // Calculate compliance status
    const compliance = {
      daily: {
        limit: 10,
        used: Math.round(hoursToday * 10) / 10,
        remaining: Math.max(0, 10 - hoursToday),
        percentage: Math.min(100, (hoursToday / 10) * 100),
        status: hoursToday >= 10 ? 'violation' : hoursToday >= 9 ? 'warning' : 'ok'
      },
      onDuty: {
        limit: 15,
        used: Math.round(hoursToday * 10) / 10,
        remaining: Math.max(0, 15 - hoursToday),
        percentage: Math.min(100, (hoursToday / 15) * 100),
        status: hoursToday >= 15 ? 'violation' : hoursToday >= 14 ? 'warning' : 'ok'
      },
      weekly: {
        limit: 60,
        used: Math.round(weeklyHours * 10) / 10,
        remaining: Math.max(0, 60 - weeklyHours),
        percentage: Math.min(100, (weeklyHours / 60) * 100),
        status: weeklyHours >= 60 ? 'violation' : weeklyHours >= 55 ? 'warning' : 'ok',
        daysWorked: daysWorkedThisWeek
      },
      eightDay: {
        limit: 70,
        used: Math.round(eightDayHours * 10) / 10,
        remaining: Math.max(0, 70 - eightDayHours),
        percentage: Math.min(100, (eightDayHours / 70) * 100),
        status: eightDayHours >= 70 ? 'violation' : eightDayHours >= 65 ? 'warning' : 'ok',
        daysWorked: daysWorkedLast8
      },
      exemption: {
        isExempt: exemptionStatus.is_exempt,
        daysExceeded: exemptionStatus.days_exceeded_this_month || 0,
        todayMiles: Math.round((exemptionStatus.today_miles || 0) * 10) / 10,
        milesRemaining: Math.max(0, 150 - (exemptionStatus.today_miles || 0)),
        status: 
          exemptionStatus.days_exceeded_this_month >= 8 ? 'violation' :
          exemptionStatus.days_exceeded_this_month >= 6 ? 'warning' :
          exemptionStatus.today_miles >= 150 ? 'warning' : 'ok'
      }
    };

    // Generate alerts
    const alerts = [];
    
    if (compliance.daily.status === 'violation') {
      alerts.push({
        type: 'error',
        message: '10-hour driving limit exceeded',
        severity: 'critical'
      });
    } else if (compliance.daily.status === 'warning') {
      alerts.push({
        type: 'warning',
        message: 'Approaching 10-hour driving limit',
        severity: 'high'
      });
    }

    if (compliance.onDuty.status === 'violation') {
      alerts.push({
        type: 'error',
        message: '15-hour on-duty limit exceeded',
        severity: 'critical'
      });
    } else if (compliance.onDuty.status === 'warning') {
      alerts.push({
        type: 'warning',
        message: 'Approaching 15-hour on-duty limit',
        severity: 'high'
      });
    }

    if (compliance.weekly.status === 'warning') {
      alerts.push({
        type: 'warning',
        message: 'Approaching 60-hour weekly limit',
        severity: 'medium'
      });
    } else if (compliance.weekly.status === 'violation') {
      alerts.push({
        type: 'error',
        message: '60-hour weekly limit exceeded',
        severity: 'critical'
      });
    }

    if (compliance.exemption.status === 'warning') {
      if (compliance.exemption.daysExceeded >= 6) {
        alerts.push({
          type: 'warning',
          message: `${compliance.exemption.daysExceeded} days exceeded 150-mile limit this month (8 day limit)`,
          severity: 'high'
        });
      } else if (compliance.exemption.todayMiles >= 140) {
        alerts.push({
          type: 'warning',
          message: 'Approaching 150-mile exemption limit for today',
          severity: 'medium'
        });
      }
    } else if (compliance.exemption.status === 'violation') {
      alerts.push({
        type: 'error',
        message: 'Exceeded 150-mile limit on 8+ days this month - ELD required',
        severity: 'critical'
      });
    }

    return NextResponse.json({
      success: true,
      compliance,
      alerts,
      dailyBreakdown: dailyBreakdownResult.rows
    });

  } catch (error) {
    console.error('❌ Error fetching HOS data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch HOS data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
