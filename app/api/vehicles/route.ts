import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  getOptionalAuth,
  logApiRequest,
  getPaginationParams,
  buildPaginationMeta
} from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * GET /api/vehicles
 * Returns list of vehicles with availability status and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Optional authentication - vehicles list can be public or authenticated
    const session = await getOptionalAuth();
    logApiRequest('GET', '/api/vehicles', session?.userId);

    const { searchParams } = new URL(request.url);
    
    // Get filter parameters
    const available = searchParams.get('available');
    const active = searchParams.get('active');
    const capacity = searchParams.get('capacity');
    
    // Get pagination parameters
    const pagination = getPaginationParams(request);

    // Build query conditions
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    if (available !== null) {
      paramCount++;
      whereConditions.push(`v.is_available = $${paramCount}`);
      queryParams.push(available === 'true');
    }

    if (active !== null) {
      paramCount++;
      whereConditions.push(`v.is_active = $${paramCount}`);
      queryParams.push(active === 'true');
    } else {
      // Default to active vehicles only
      paramCount++;
      whereConditions.push(`v.is_active = $${paramCount}`);
      queryParams.push(true);
    }

    if (capacity) {
      paramCount++;
      whereConditions.push(`v.capacity >= $${paramCount}`);
      queryParams.push(parseInt(capacity));
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM vehicles v
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // Add pagination params
    paramCount++;
    queryParams.push(pagination.limit);
    paramCount++;
    queryParams.push(pagination.offset);

    // Get vehicles with current assignment status
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
        v.current_mileage,
        v.fuel_level,
        v.is_active,
        CASE 
          WHEN tc.id IS NOT NULL THEN false
          ELSE true
        END as is_available,
        v.last_service_date,
        v.next_service_due,
        v.insurance_expiry,
        v.registration_expiry,
        v.created_at,
        v.updated_at,
        -- Current assignment info
        tc.driver_id as assigned_driver_id,
        u.name as assigned_driver,
        tc.clock_in_time as assignment_start,
        -- Last inspection info
        (
          SELECT MAX(created_at) 
          FROM inspections 
          WHERE vehicle_id = v.id
        ) as last_inspection,
        -- Service status
        CASE 
          WHEN v.next_service_due <= v.current_mileage THEN true
          ELSE false
        END as service_required
      FROM vehicles v
      LEFT JOIN time_cards tc ON v.id = tc.vehicle_id 
        AND tc.clock_out_time IS NULL 
        AND DATE(tc.clock_in_time) = CURRENT_DATE
      LEFT JOIN users u ON tc.driver_id = u.id
      ${whereClause}
      ORDER BY v.vehicle_number
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);

    // Calculate availability statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE v.is_active = true AND tc.id IS NULL) as available_count,
        COUNT(*) FILTER (WHERE v.is_active = true AND tc.id IS NOT NULL) as in_use_count,
        COUNT(*) FILTER (WHERE v.is_active = false) as inactive_count,
        COUNT(*) as total_count
      FROM vehicles v
      LEFT JOIN time_cards tc ON v.id = tc.vehicle_id 
        AND tc.clock_out_time IS NULL 
        AND DATE(tc.clock_in_time) = CURRENT_DATE
    `);

    const stats = statsResult.rows[0];

    // Build pagination metadata
    const paginationMeta = buildPaginationMeta(pagination, total);

    // Format response
    const responseData = {
      vehicles: result.rows.map(vehicle => ({
        id: vehicle.id,
        vehicle_number: vehicle.vehicle_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        capacity: vehicle.capacity,
        current_mileage: vehicle.current_mileage,
        is_active: vehicle.is_active,
        is_available: vehicle.is_available,
        assigned_driver: vehicle.assigned_driver,
        last_inspection: vehicle.last_inspection,
      })),
      statistics: {
        available: parseInt(stats.available_count),
        in_use: parseInt(stats.in_use_count),
        inactive: parseInt(stats.inactive_count),
        total: parseInt(stats.total_count),
      },
      pagination: paginationMeta,
    };

    return successResponse(responseData, 'Vehicles retrieved successfully', 30); // Cache for 30 seconds

  } catch (error) {
    console.error('Get vehicles error:', error);
    return errorResponse('Failed to retrieve vehicles', 500);
  }
}
