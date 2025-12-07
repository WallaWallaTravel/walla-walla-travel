/**
 * Admin Dashboard Service
 * 
 * Business logic for admin dashboard data
 */

import { BaseService } from './base.service';

export interface DashboardData {
  activeShifts: any[];
  fleetStatus: any[];
  statistics: {
    shifts: {
      total_today: number;
      active: number;
      completed: number;
    };
    services: {
      total_today: number;
      active: number;
      completed: number;
    };
    revenue: {
      total_today: number;
      service_hours_today: number;
    };
    fleet: {
      total: number;
      available: number;
      in_use: number;
      out_of_service: number;
      utilization_rate: number;
    };
  };
  lastUpdated: string;
}

export class AdminDashboardService extends BaseService {
  protected get serviceName(): string {
    return 'AdminDashboardService';
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    this.log('Getting admin dashboard data');

    // Get active shifts
    const activeShifts = await this.queryMany(`
      SELECT
        time_card_id, driver_id, driver_name, driver_email,
        vehicle_id, vehicle_number, make, model, vehicle_status,
        clock_in_time, shift_status, work_reporting_location,
        client_service_id, client_name, hourly_rate, service_status,
        pickup_time, dropoff_time, service_hours, total_cost,
        assigned_by, assigned_by_name
      FROM active_shifts
      ORDER BY clock_in_time DESC
    `);

    // Get fleet status
    const fleetStatus = await this.queryMany(`
      SELECT
        vehicle_id, vehicle_number, make, model, year, capacity,
        status, license_plate, defect_notes, active_time_card_id,
        current_driver_id, current_driver_name, in_use_since,
        current_client, availability_status
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

    // Get today's statistics
    const stats = await this.queryOne(`
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
    const totalVehicles = fleetStatus.length;
    const availableVehicles = fleetStatus.filter((v: any) => v.availability_status === 'available').length;
    const inUseVehicles = fleetStatus.filter((v: any) => v.availability_status === 'in_use').length;
    const outOfServiceVehicles = fleetStatus.filter((v: any) => v.availability_status === 'out_of_service').length;
    const utilizationRate = totalVehicles > 0 ? Math.round((inUseVehicles / totalVehicles) * 100) : 0;

    return {
      activeShifts,
      fleetStatus,
      statistics: {
        shifts: {
          total_today: parseInt(stats?.total_shifts_today || 0),
          active: parseInt(stats?.active_shifts || 0),
          completed: parseInt(stats?.completed_shifts || 0),
        },
        services: {
          total_today: parseInt(stats?.total_services_today || 0),
          active: parseInt(stats?.active_services || 0),
          completed: parseInt(stats?.completed_services || 0),
        },
        revenue: {
          total_today: parseFloat(stats?.total_revenue_today || 0),
          service_hours_today: parseFloat(stats?.total_service_hours_today || 0),
        },
        fleet: {
          total: totalVehicles,
          available: availableVehicles,
          in_use: inUseVehicles,
          out_of_service: outOfServiceVehicles,
          utilization_rate: utilizationRate,
        },
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const adminDashboardService = new AdminDashboardService();




