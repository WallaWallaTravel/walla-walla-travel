import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  logApiRequest
} from '@/app/api/utils';
import { requireAdmin } from '@/lib/admin-auth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/dashboard
 * Returns real-time supervisor dashboard data:
 * - Active shifts (drivers currently clocked in)
 * - Fleet status (vehicle availability)
 * - Today's statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin();
    if ('status' in authResult) {
      return authResult;
    }

    logApiRequest('GET', '/api/admin/dashboard', authResult.userId);

    // Get active shifts using the view created in migration
    const activeShiftsResult = await query(`
      SELECT
        time_card_id,
        driver_id,
        driver_name,
        driver_email,
        vehicle_id,
        vehicle_number,
        make,
        model,
        vehicle_status,
        clock_in_time,
        shift_status,
        work_reporting_location,
        client_service_id,
        client_name,
        hourly_rate,
        service_status,
        pickup_time,
        dropoff_time,
        service_hours,
        total_cost,
        assigned_by,
        assigned_by_name
      FROM active_shifts
      ORDER BY clock_in_time DESC
    `);

    // Get fleet status using the view created in migration
    const fleetStatusResult = await query(`
      SELECT
        vehicle_id,
        vehicle_number,
        make,
        model,
        year,
        capacity,
        status,
        license_plate,
        defect_notes,
        active_time_card_id,
        current_driver_id,
        current_driver_name,
        in_use_since,
        current_client,
        availability_status
      FROM fleet_status
      ORDER BY
        CASE availability_status
          WHEN 'available' THEN 1
          WHEN 'in_use' THEN 2
          WHEN 'out_of_service' THEN 3
          ELSE 4
        END,
        vehicle_number
    `);

    // Get today's statistics (Pacific Time)
    const statsResult = await query(`
      SELECT
        COUNT(DISTINCT tc.id) as total_shifts_today,
        COUNT(DISTINCT tc.id) FILTER (WHERE tc.clock_out_time IS NULL) as active_shifts,
        COUNT(DISTINCT tc.id) FILTER (WHERE tc.clock_out_time IS NOT NULL) as completed_shifts,
        COUNT(DISTINCT cs.id) as total_services_today,
        COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'in_progress') as active_services,
        COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'completed') as completed_services,
        COALESCE(SUM(cs.total_cost) FILTER (WHERE cs.status = 'completed'), 0) as total_revenue_today,
        COALESCE(SUM(cs.service_hours) FILTER (WHERE cs.status = 'completed'), 0) as total_service_hours_today
      FROM time_cards tc
      LEFT JOIN client_services cs ON tc.id = cs.time_card_id
      WHERE DATE(tc.created_at AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
    `);

    // Calculate fleet utilization
    const totalVehicles = fleetStatusResult.rows.length;
    const availableVehicles = fleetStatusResult.rows.filter(v => v.availability_status === 'available').length;
    const inUseVehicles = fleetStatusResult.rows.filter(v => v.availability_status === 'in_use').length;
    const outOfServiceVehicles = fleetStatusResult.rows.filter(v => v.availability_status === 'out_of_service').length;
    const utilizationRate = totalVehicles > 0 ? Math.round((inUseVehicles / totalVehicles) * 100) : 0;

    const stats = statsResult.rows[0];

    return successResponse({
      activeShifts: activeShiftsResult.rows,
      fleetStatus: fleetStatusResult.rows,
      statistics: {
        shifts: {
          total_today: parseInt(stats.total_shifts_today || 0),
          active: parseInt(stats.active_shifts || 0),
          completed: parseInt(stats.completed_shifts || 0)
        },
        services: {
          total_today: parseInt(stats.total_services_today || 0),
          active: parseInt(stats.active_services || 0),
          completed: parseInt(stats.completed_services || 0)
        },
        revenue: {
          total_today: parseFloat(stats.total_revenue_today || 0),
          service_hours_today: parseFloat(stats.total_service_hours_today || 0)
        },
        fleet: {
          total: totalVehicles,
          available: availableVehicles,
          in_use: inUseVehicles,
          out_of_service: outOfServiceVehicles,
          utilization_rate: utilizationRate
        }
      },
      lastUpdated: new Date().toISOString()
    }, 'Dashboard data retrieved successfully');

  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    return errorResponse('Failed to retrieve dashboard data', 500);
  }
}
