import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import {
  requireAuth,
  logApiRequest,
  formatDateForDB,
  generateId
} from '@/app/api/utils';
import { query } from '@/lib/db';
import { z } from 'zod';

// Request body schema
const DVIRSchema = z.object({
  vehicleId: z.number().int().positive('Vehicle ID must be a positive integer'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preTripInspectionId: z.number().int().positive().optional(),
  postTripInspectionId: z.number().int().positive().optional(),
  defects: z.array(z.object({
    component: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    severity: z.enum(['minor', 'major', 'critical']),
  })).default([]),
  signature: z.string().min(1, 'Signature is required').max(5000),
});

/**
 * POST /api/inspections/dvir
 * Create a Driver Vehicle Inspection Report
 *
 * Uses withErrorHandling middleware for consistent error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const authResult = await requireAuth();
  if ('status' in authResult) {
    return authResult;
  }
  const session = authResult;

  logApiRequest('POST', '/api/inspections/dvir', session.userId);

  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    throw new BadRequestError('Invalid JSON in request body');
  }

  const parseResult = DVIRSchema.safeParse(rawBody);
  if (!parseResult.success) {
    throw new BadRequestError('Validation failed: ' + parseResult.error.issues.map((e) => e.message).join(', '));
  }

  const body = parseResult.data;

  const dvirDate = body.date || formatDateForDB(new Date());
  const dvirId = `dvir-${generateId()}`;

  // Create DVIR record - try dedicated table first, then fallback to inspections
  let result = await query(`
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
  ]).catch(async (error: Error) => {
    // If DVIR table doesn't exist, store as inspection
    if (error.message.includes('dvir_reports')) {
      return query(`
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
    }
    throw error;
  });

  // If no rows returned from primary insert, try fallback
  if (result.rowCount === 0) {
    result = await query(`
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
  }

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'DVIR created successfully'
  });
});

/**
 * GET /api/inspections/dvir
 * Get DVIRs for the authenticated driver
 *
 * Uses withErrorHandling middleware for consistent error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
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

    return NextResponse.json({
      success: true,
      data: result.rows,
      message: 'DVIRs retrieved'
    });
  }

  // Get specific DVIR
  const result = await query(`
    SELECT * FROM inspections
    WHERE id = $1 AND driver_id = $2 AND type = 'dvir'
  `, [dvirId, parseInt(session.userId)]);

  if (result.rows.length === 0) {
    throw new NotFoundError('DVIR not found');
  }

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'DVIR retrieved'
  });
});
