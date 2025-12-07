import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  requireAuth,
  logApiRequest,
  formatDateForDB
} from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * GET /api/vehicles/assigned
 * Returns the vehicle currently assigned to the authenticated driver
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication - required for this endpoint
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('GET', '/api/vehicles/assigned', session.userId);

    const driverId = parseInt(session.userId);
    const today = formatDateForDB(new Date());
    
    console.log('🚐 Getting assigned vehicle for driver:', driverId);

    // First check if driver has a permanently assigned vehicle
    // This is now the primary way vehicles are assigned
    const permanentVehicleResult = await query(`
      SELECT 
        v.id,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.vin,
        v.license_plate,
        v.capacity,
        v.is_active,
        v.status,
        v.assigned_driver_id,
        -- Placeholder values for compatibility
        0 as current_mileage,
        'full' as fuel_level,
        false as service_required,
        'valid' as registration_status,
        'valid' as insurance_status
      FROM vehicles v
      WHERE v.assigned_driver_id = $1
        AND v.status = 'assigned'
        AND v.is_active = true
      LIMIT 1
    `, [driverId]);
    
    console.log('Permanent vehicle query result:', permanentVehicleResult.rowCount, 'rows');
    
    if ((permanentVehicleResult.rowCount ?? 0) > 0) {
      const vehicle = permanentVehicleResult.rows[0];
      console.log('Found permanently assigned vehicle:', vehicle.vehicle_number);
      
      // Return the permanently assigned vehicle
      return successResponse({
        ...vehicle,
        assignment_type: 'permanent',
        is_available: false,
      }, 'Permanently assigned vehicle retrieved');
    }

    // If no permanent assignment, check for ACTIVE time card (currently clocked in)
    const result = await query(`
      SELECT
        v.id,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.vin,
        v.license_plate,
        v.capacity,
        v.is_active,
        v.status,
        tc.id as time_card_id,
        tc.clock_in_time as assignment_start,
        tc.clock_out_time as assignment_end,
        -- Placeholder values
        0 as current_mileage,
        'full' as fuel_level,
        false as service_required,
        'valid' as registration_status,
        'valid' as insurance_status,
        0 as routes_completed_today,
        0 as routes_remaining_today
      FROM time_cards tc
      JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.driver_id = $1
        AND tc.clock_out_time IS NULL
      ORDER BY tc.clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    if (result.rowCount === 0) {
      // No vehicle assigned at all
      console.log('No vehicle assigned to driver', driverId);
      return successResponse(null, 'No vehicle assigned to driver');
    }

    const assignedVehicle = result.rows[0];

    // Get pre-trip inspection status for today
    const inspectionResult = await query(`
      SELECT 
        id,
        type,
        created_at,
        status,
        issues_found
      FROM inspections
      WHERE vehicle_id = $1
        AND driver_id = $2
        AND DATE(created_at) = $3
        AND type = 'pre_trip'
      ORDER BY created_at DESC
      LIMIT 1
    `, [assignedVehicle.id, driverId, today]);

    const preTripInspection = inspectionResult.rows[0] || null;

    // Get today's mileage
    const mileageResult = await query(`
      SELECT 
        COALESCE(SUM(end_mileage - start_mileage), 0) as miles_today
      FROM time_cards
      WHERE vehicle_id = $1
        AND DATE(clock_in_time) = $2
        AND end_mileage IS NOT NULL
    `, [assignedVehicle.id, today]);

    const milesToday = mileageResult.rows[0]?.miles_today || 0;

    // Check for any active alerts/issues
    const alerts = [];
    
    if (assignedVehicle.service_required) {
      alerts.push({
        type: 'service',
        severity: 'warning',
        message: `Service required - ${assignedVehicle.next_service_due - assignedVehicle.current_mileage} miles overdue`,
      });
    }

    if (assignedVehicle.registration_status === 'expired') {
      alerts.push({
        type: 'registration',
        severity: 'critical',
        message: 'Vehicle registration expired',
      });
    } else if (assignedVehicle.registration_status === 'expiring_soon') {
      alerts.push({
        type: 'registration',
        severity: 'warning',
        message: 'Vehicle registration expiring soon',
      });
    }

    if (assignedVehicle.insurance_status === 'expired') {
      alerts.push({
        type: 'insurance',
        severity: 'critical',
        message: 'Vehicle insurance expired',
      });
    } else if (assignedVehicle.insurance_status === 'expiring_soon') {
      alerts.push({
        type: 'insurance',
        severity: 'warning',
        message: 'Vehicle insurance expiring soon',
      });
    }

    if (!preTripInspection) {
      alerts.push({
        type: 'inspection',
        severity: 'info',
        message: 'Pre-trip inspection not completed',
      });
    }

    // Format response
    const responseData = {
      id: assignedVehicle.id,
      vehicle_number: assignedVehicle.vehicle_number,
      make: assignedVehicle.make,
      model: assignedVehicle.model,
      year: assignedVehicle.year,
      capacity: assignedVehicle.capacity,
      current_mileage: assignedVehicle.current_mileage,
      fuel_level: assignedVehicle.fuel_level,
      is_available: false,
      assignment_type: 'daily',
      assignment_start: assignedVehicle.assignment_start,
      assignment_start_mileage: assignedVehicle.assignment_start_mileage,
      assignment_end: assignedVehicle.assignment_end,
      assignment_end_mileage: assignedVehicle.assignment_end_mileage,
      service_required: assignedVehicle.service_required,
      pre_trip_inspection: preTripInspection,
      today_stats: {
        miles_driven: milesToday,
        routes_completed: assignedVehicle.routes_completed_today || 0,
        routes_remaining: assignedVehicle.routes_remaining_today || 0,
      },
      alerts: alerts,
      compliance: {
        registration: assignedVehicle.registration_status,
        insurance: assignedVehicle.insurance_status,
      },
    };

    return successResponse(responseData, 'Assigned vehicle retrieved successfully');

  } catch (error: any) {
    console.error('❌ Get assigned vehicle error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return errorResponse(`Failed to retrieve assigned vehicle: ${error.message}`, 500);
  }
}