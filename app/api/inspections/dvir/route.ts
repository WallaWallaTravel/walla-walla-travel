import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  requireAuth,
  parseRequestBody,
  validateRequiredFields,
  logApiRequest,
  formatDateForDB,
  generateId
} from '@/app/api/utils';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('POST', '/api/inspections/dvir', session.userId);

    // Parse request body
    const body = await parseRequestBody<{
      vehicleId: number;
      date?: string;
      preTripInspectionId?: number;
      postTripInspectionId?: number;
      defects: Array<{
        component: string;
        description: string;
        severity: string;
      }>;
      signature: string;
    }>(request);

    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body, ['vehicleId', 'signature']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    const dvirDate = body.date || formatDateForDB(new Date());
    const dvirId = `dvir-${generateId()}`;

    // Create DVIR record
    const result = await query(`
      INSERT INTO dvir_reports (
        id, driver_id, vehicle_id, report_date, 
        pre_trip_inspection_id, post_trip_inspection_id,
        defects_found, defects_description, 
        driver_signature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      dvirId,
      parseInt(session.userId),
      body.vehicleId,
      dvirDate,
      body.preTripInspectionId || null,
      body.postTripInspectionId || null,
      body.defects.length > 0,
      body.defects.length > 0 ? JSON.stringify(body.defects) : null,
      body.signature
    ]);

    // If no specific table exists, create a simplified response
    if (result.rowCount === 0) {
      // Fallback: Store DVIR as a special inspection type
      const dvirResult = await query(`
        INSERT INTO inspections (
          driver_id, vehicle_id, type, inspection_data, status
        ) VALUES ($1, $2, 'dvir', $3, $4)
        RETURNING *
      `, [
        parseInt(session.userId),
        body.vehicleId,
        JSON.stringify({
          date: dvirDate,
          defects: body.defects,
          signature: body.signature,
          preTripInspectionId: body.preTripInspectionId,
          postTripInspectionId: body.postTripInspectionId
        }),
        body.defects.length > 0 ? 'requires_attention' : 'completed'
      ]);

      return successResponse(dvirResult.rows[0], 'DVIR created successfully');
    }

    return successResponse(result.rows[0], 'DVIR created successfully');

  } catch (error) {
    console.error('DVIR creation error:', error);
    
    // If DVIR table doesn't exist, store as inspection
    if (error instanceof Error && error.message.includes('dvir_reports')) {
      try {
        const body = await request.json();
        const authResult = await requireAuth();
        if ('status' in authResult) {
          return authResult;
        }
        const session = authResult;
        
        const dvirResult = await query(`
          INSERT INTO inspections (
            driver_id, vehicle_id, type, inspection_data, status
          ) VALUES ($1, $2, 'dvir', $3, $4)
          RETURNING *
        `, [
          parseInt(session.userId),
          body.vehicleId,
          JSON.stringify({
            date: body.date || formatDateForDB(new Date()),
            defects: body.defects || [],
            signature: body.signature
          }),
          (body.defects && body.defects.length > 0) ? 'requires_attention' : 'completed'
        ]);

        return successResponse(dvirResult.rows[0], 'DVIR created successfully');
      } catch (fallbackError) {
        return errorResponse('Failed to create DVIR', 500);
      }
    }
    
    return errorResponse('Failed to create DVIR', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    const { searchParams } = new URL(request.url);
    const dvirId = searchParams.get('id');

    if (!dvirId) {
      // Get recent DVIRs
      const result = await query(`
        SELECT * FROM inspections 
        WHERE driver_id = $1 AND type = 'dvir'
        ORDER BY created_at DESC 
        LIMIT 10
      `, [parseInt(session.userId)]);

      return successResponse(result.rows, 'DVIRs retrieved');
    }

    // Get specific DVIR
    const result = await query(`
      SELECT * FROM inspections 
      WHERE id = $1 AND driver_id = $2 AND type = 'dvir'
    `, [dvirId, parseInt(session.userId)]);

    if (result.rows.length === 0) {
      return errorResponse('DVIR not found', 404);
    }

    return successResponse(result.rows[0], 'DVIR retrieved');

  } catch (error) {
    console.error('Get DVIR error:', error);
    return errorResponse('Failed to retrieve DVIR', 500);
  }
}