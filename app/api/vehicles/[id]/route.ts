import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  getOptionalAuth,
  logApiRequest
} from '@/app/api/utils';
import { query } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

/**
 * GET /api/vehicles/:id
 * Returns detailed information about a specific vehicle
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Optional authentication
    const session = await getOptionalAuth();
    logApiRequest('GET', `/api/vehicles/${params.id}`, session?.userId);

    // Validate vehicle ID
    const vehicleId = parseInt(params.id);
    if (isNaN(vehicleId)) {
      return errorResponse('Invalid vehicle ID', 400);
    }

    // Get vehicle details
    const vehicleResult = await query(`
      SELECT 
        v.*,
        -- Current assignment info
        tc.driver_id as assigned_driver_id,
        u.name as assigned_driver,
        u.email as assigned_driver_email,
        u.phone as assigned_driver_phone,
        tc.clock_in_time as assignment_start,
        tc.start_mileage as assignment_start_mileage,
        -- Availability status
        CASE 
          WHEN tc.id IS NOT NULL THEN false
          ELSE true
        END as is_available,
        -- Service status
        CASE 
          WHEN v.next_service_due <= v.current_mileage THEN true
          ELSE false
        END as service_required,
        -- Last inspection
        (
          SELECT json_build_object(
            'id', i.id,
            'type', i.type,
            'date', i.created_at,
            'driver', u2.name,
            'issues_found', i.issues_found,
            'status', i.status
          )
          FROM inspections i
          JOIN users u2 ON i.driver_id = u2.id
          WHERE i.vehicle_id = v.id
          ORDER BY i.created_at DESC
          LIMIT 1
        ) as last_inspection_details
      FROM vehicles v
      LEFT JOIN time_cards tc ON v.id = tc.vehicle_id 
        AND tc.clock_out_time IS NULL 
        AND DATE(tc.clock_in_time) = CURRENT_DATE
      LEFT JOIN users u ON tc.driver_id = u.id
      WHERE v.id = $1
    `, [vehicleId]);

    if (vehicleResult.rowCount === 0) {
      return errorResponse('Vehicle not found', 404);
    }

    const vehicle = vehicleResult.rows[0];

    // Get maintenance history
    const maintenanceResult = await query(`
      SELECT 
        id,
        service_date,
        service_type,
        description,
        mileage,
        cost,
        performed_by,
        next_service_due,
        created_at
      FROM maintenance_records
      WHERE vehicle_id = $1
      ORDER BY service_date DESC
      LIMIT 10
    `, [vehicleId]);

    // Get recent mileage history
    const mileageResult = await query(`
      SELECT 
        recorded_date,
        mileage,
        recorded_by,
        notes
      FROM mileage_logs
      WHERE vehicle_id = $1
      ORDER BY recorded_date DESC
      LIMIT 10
    `, [vehicleId]);

    // Get upcoming scheduled routes
    const routesResult = await query(`
      SELECT 
        r.id,
        r.route_date,
        r.route_name,
        r.start_time,
        r.end_time,
        r.passenger_count,
        u.name as driver_name
      FROM routes r
      LEFT JOIN users u ON r.driver_id = u.id
      WHERE r.vehicle_id = $1 
        AND r.route_date >= CURRENT_DATE
        AND r.status = 'scheduled'
      ORDER BY r.route_date, r.start_time
      LIMIT 5
    `, [vehicleId]);

    // Get usage statistics
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT DATE(clock_in_time)) as days_used,
        COUNT(DISTINCT driver_id) as unique_drivers,
        COALESCE(AVG(end_mileage - start_mileage), 0) as avg_daily_miles,
        COALESCE(SUM(end_mileage - start_mileage), 0) as total_miles_driven
      FROM time_cards
      WHERE vehicle_id = $1
        AND clock_in_time >= CURRENT_DATE - INTERVAL '30 days'
    `, [vehicleId]);

    const stats = statsResult.rows[0];

    // Check compliance status
    const complianceResult = await query(`
      SELECT 
        -- Registration status
        CASE 
          WHEN v.registration_expiry < CURRENT_DATE THEN 'expired'
          WHEN v.registration_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
          ELSE 'valid'
        END as registration_status,
        -- Insurance status
        CASE 
          WHEN v.insurance_expiry < CURRENT_DATE THEN 'expired'
          WHEN v.insurance_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
          ELSE 'valid'
        END as insurance_status,
        -- Inspection status
        CASE 
          WHEN v.inspection_due < CURRENT_DATE THEN 'overdue'
          WHEN v.inspection_due < CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'current'
        END as inspection_status
      FROM vehicles v
      WHERE v.id = $1
    `, [vehicleId]);

    const compliance = complianceResult.rows[0];

    // Format response
    const responseData = {
      vehicle: {
        id: vehicle.id,
        vehicle_number: vehicle.vehicle_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        license_plate: vehicle.license_plate,
        capacity: vehicle.capacity,
        current_mileage: vehicle.current_mileage,
        fuel_level: vehicle.fuel_level,
        is_active: vehicle.is_active,
        is_available: vehicle.is_available,
        last_service_date: vehicle.last_service_date,
        next_service_due: vehicle.next_service_due,
        service_required: vehicle.service_required,
        insurance_expiry: vehicle.insurance_expiry,
        registration_expiry: vehicle.registration_expiry,
        inspection_due: vehicle.inspection_due,
        created_at: vehicle.created_at,
        updated_at: vehicle.updated_at,
      },
      current_assignment: vehicle.assigned_driver ? {
        driver_id: vehicle.assigned_driver_id,
        driver_name: vehicle.assigned_driver,
        driver_email: vehicle.assigned_driver_email,
        driver_phone: vehicle.assigned_driver_phone,
        start_time: vehicle.assignment_start,
        start_mileage: vehicle.assignment_start_mileage,
      } : null,
      last_inspection: vehicle.last_inspection_details,
      maintenance_history: maintenanceResult.rows,
      mileage_history: mileageResult.rows,
      upcoming_routes: routesResult.rows,
      usage_statistics: {
        days_used_last_30: parseInt(stats.days_used),
        unique_drivers: parseInt(stats.unique_drivers),
        avg_daily_miles: parseFloat(stats.avg_daily_miles).toFixed(2),
        total_miles_last_30: parseInt(stats.total_miles_driven),
      },
      compliance: compliance,
    };

    return successResponse(responseData, 'Vehicle details retrieved successfully');

  } catch (error) {
    console.error('Get vehicle by ID error:', error);
    return errorResponse('Failed to retrieve vehicle details', 500);
  }
}