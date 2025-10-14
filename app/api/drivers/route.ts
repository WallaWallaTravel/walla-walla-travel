import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/drivers
 * Returns list of active drivers
 */
export async function GET() {
  try {
    const result = await query(
      `SELECT 
        id, 
        email, 
        name, 
        role, 
        phone,
        license_number,
        license_state,
        license_expiry,
        created_at,
        last_login
      FROM users 
      WHERE is_active = true 
      AND role IN ('driver', 'owner')
      ORDER BY 
        CASE 
          WHEN role = 'owner' THEN 0 
          ELSE 1 
        END,
        name`
    );

    return NextResponse.json({
      success: true,
      drivers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching drivers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch drivers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
