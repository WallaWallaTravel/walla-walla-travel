import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { withAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';

/**
 * POST /api/inspections/quick
 * Quick inspection endpoint for emergency use
 *
 * Uses withErrorHandling middleware for consistent error handling
 */
export const POST = withErrorHandling(
  withAuth(async (request: NextRequest, session: AuthSession) => {
    const body = await request.json();
    const { vehicleId, startMileage, type, inspectionData } = body;

    // Get user ID from session (AuthSession provides userId directly)
    const userId = session.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Save inspection to database using correct column names
    const result = await query(
      `INSERT INTO inspections (
        vehicle_id,
        driver_id,
        type,
        start_mileage,
        inspection_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'completed', NOW(), NOW())
      RETURNING id, created_at`,
      [
        vehicleId,
        userId,
        type || 'pre_trip',
        startMileage || 0,
        JSON.stringify({
          items: inspectionData?.items || {},
          notes: inspectionData?.notes || '',
          signature: inspectionData?.signature ? 'captured' : null
        })
      ]
    );

    const inspection = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        inspectionId: inspection.id,
        date: inspection.created_at,
        vehicleId,
        mileage: startMileage
      },
      message: 'Inspection saved successfully'
    });
  })
);
