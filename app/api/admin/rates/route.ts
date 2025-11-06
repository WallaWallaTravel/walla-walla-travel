import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * GET /api/admin/rates
 * Fetch all rate configurations
 */
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        config_key,
        config_value,
        description,
        last_updated_by,
        updated_at,
        created_at
      FROM rate_config
      ORDER BY 
        CASE config_key
          WHEN 'wine_tours' THEN 1
          WHEN 'transfers' THEN 2
          WHEN 'wait_time' THEN 3
          WHEN 'deposits_and_fees' THEN 4
          WHEN 'gratuity' THEN 5
          ELSE 99
        END`
    );

    return NextResponse.json({
      success: true,
      rates: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/rates
 * Update a specific rate configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { config_key, config_value, changed_by, change_reason } = body;

    if (!config_key || !config_value) {
      return NextResponse.json(
        { success: false, error: 'config_key and config_value are required' },
        { status: 400 }
      );
    }

    // Get the old value for audit log
    const oldValueResult = await pool.query(
      'SELECT config_value FROM rate_config WHERE config_key = $1',
      [config_key]
    );

    if (oldValueResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rate configuration not found' },
        { status: 404 }
      );
    }

    const oldValue = oldValueResult.rows[0].config_value;

    // Update the rate configuration
    const updateResult = await pool.query(
      `UPDATE rate_config 
       SET config_value = $1, 
           last_updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE config_key = $3
       RETURNING *`,
      [JSON.stringify(config_value), changed_by || 'admin', config_key]
    );

    // Log the change
    await pool.query(
      `INSERT INTO rate_change_log (config_key, old_value, new_value, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        config_key,
        JSON.stringify(oldValue),
        JSON.stringify(config_value),
        changed_by || 'admin',
        change_reason || 'Manual update'
      ]
    );

    return NextResponse.json({
      success: true,
      rate: updateResult.rows[0],
      message: 'Rate configuration updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update rates' },
      { status: 500 }
    );
  }
}

