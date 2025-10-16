import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  requireAuth,
  logApiRequest,
  getPaginationParams,
  buildPaginationMeta
} from '@/app/api/utils';
import { getInspectionsByDriver, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('GET', '/api/inspections/history', session.userId);

    // Get pagination parameters
    const pagination = getPaginationParams(request);
    
    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // pre_trip, post_trip, dvir, or all

    // Build query conditions
    let whereConditions = ['i.driver_id = $1'];
    const queryParams: any[] = [parseInt(session.userId)];
    let paramCount = 1;

    if (type && type !== 'all') {
      paramCount++;
      whereConditions.push(`i.type = $${paramCount}`);
      queryParams.push(type);
    }

    if (startDate) {
      paramCount++;
      whereConditions.push(`DATE(i.created_at) >= $${paramCount}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`DATE(i.created_at) <= $${paramCount}`);
      queryParams.push(endDate);
    }

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM inspections i
      WHERE ${whereConditions.join(' AND ')}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // Add pagination params
    paramCount++;
    queryParams.push(pagination.limit);
    paramCount++;
    queryParams.push(pagination.offset);

    // Get inspections with vehicle details
    const result = await query(`
      SELECT 
        i.id,
        i.type,
        i.status,
        i.start_mileage,
        i.end_mileage,
        i.issues_found,
        i.issues_description,
        i.created_at,
        v.vehicle_number,
        v.make,
        v.model,
        v.year
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);

    // Format the response with pagination metadata
    const paginationMeta = buildPaginationMeta(pagination, total);

    return successResponse({
      inspections: result.rows,
      pagination: paginationMeta,
    }, 'Inspection history retrieved');

  } catch (error) {
    console.error('Get inspection history error:', error);
    return errorResponse('Failed to retrieve inspection history', 500);
  }
}