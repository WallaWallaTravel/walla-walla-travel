import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/app/api/utils';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return errorResponse('Unauthorized', 401);
    }

    // Get all vehicles with their current status
    // A vehicle is available if:
    // 1. It's active
    // 2. It's not currently being used in an active shift
    const vehiclesQuery = `
      SELECT 
        v.id,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.capacity,
        v.license_plate,
        v.vin,
        v.is_active,
        v.status as vehicle_status,
        CASE 
          WHEN tc.id IS NOT NULL THEN 'in_use'
          WHEN v.status = 'assigned' AND tc.driver_id = $1 THEN 'assigned'
          WHEN v.status = 'assigned' THEN 'assigned_other'
          ELSE 'available'
        END as status,
        tc.driver_id as current_driver_id,
        d.name as current_driver_name
      FROM vehicles v
      LEFT JOIN time_cards tc ON v.id = tc.vehicle_id
        AND tc.clock_out_time IS NULL
        AND tc.date = CURRENT_DATE
      LEFT JOIN users d ON tc.driver_id = d.id
      WHERE v.is_active = true
        AND v.status != 'out_of_service'  -- Exclude vehicles marked as out of service due to critical defects
      ORDER BY 
        CASE 
          WHEN tc.id IS NULL THEN 0      -- Show available vehicles first
          WHEN tc.driver_id = $1 THEN 1  -- Then vehicles in use by current driver
          ELSE 2                          -- Then vehicles in use by others
        END,
        v.vehicle_number
    `;

    const result = await query(vehiclesQuery, [authResult.userId]);

    // Format the vehicles for the UI
    const vehicles = result.rows.map(vehicle => ({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicle_number,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      licensePlate: vehicle.license_plate,
      vin: vehicle.vin,
      status: vehicle.status,
      currentDriver: vehicle.current_driver_name,
      isAvailable: vehicle.status === 'available' || vehicle.status === 'assigned',
      isAssignedToMe: vehicle.status === 'assigned',
      displayName: `${vehicle.vehicle_number} - ${vehicle.make} ${vehicle.model}`
    }));

    // Separate vehicles by status for easier UI rendering
    const categorizedVehicles = {
      assigned: vehicles.filter(v => v.status === 'assigned'),
      available: vehicles.filter(v => v.status === 'available'),
      inUse: vehicles.filter(v => v.status === 'in_use' || v.status === 'assigned_other'),
      all: vehicles
    };

    return successResponse({
      vehicles: categorizedVehicles,
      summary: {
        total: vehicles.length,
        assigned: categorizedVehicles.assigned.length,
        available: categorizedVehicles.available.length,
        inUse: categorizedVehicles.inUse.length
      }
    });

  } catch (error) {
    console.error('Error in /api/vehicles/available:', error);
    logger.error('GET /api/vehicles/available', 'Error fetching available vehicles', error);
    
    // Return more detailed error in development
    if (process.env.NODE_ENV === 'development') {
      return errorResponse(`Failed to fetch vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
    
    return errorResponse('Failed to fetch available vehicles', 500);
  }
}