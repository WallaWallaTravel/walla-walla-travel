import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware/auth-wrapper'
import { query } from '@/lib/db'

/**
 * POST /api/inspections/quick
 * Quick inspection endpoint for emergency use
 */
export const POST = withAuth(async (request: NextRequest, session) => {
  try {
    const body = await request.json()
    const { vehicleId, startMileage, type, inspectionData } = body

    // Get user ID from session
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not authenticated' 
      }, { status: 401 })
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
    )

    const inspection = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        inspectionId: inspection.id,
        date: inspection.created_at,
        vehicleId,
        mileage: startMileage
      },
      message: 'Inspection saved successfully'
    })
  } catch (error) {
    console.error('Quick inspection error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save inspection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})
