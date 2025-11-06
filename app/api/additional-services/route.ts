import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';

/**
 * GET /api/additional-services
 * List all additional services (optionally filter by active)
 */
export async function GET(request: NextRequest) {
  const pool = new Pool(getDbConfig());

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = `
      SELECT id, name, description, price, is_active, display_order, icon, created_at, updated_at
      FROM additional_services
    `;

    if (activeOnly) {
      query += ' WHERE is_active = TRUE';
    }

    query += ' ORDER BY display_order ASC, name ASC';

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching additional services:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch additional services' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * POST /api/additional-services
 * Create a new additional service
 */
export async function POST(request: NextRequest) {
  const pool = new Pool(getDbConfig());

  try {
    const body = await request.json();
    const { name, description, price, icon = '✨' } = body;

    // Validation
    if (!name || !price) {
      return NextResponse.json(
        { success: false, error: 'Name and price are required' },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be positive' },
        { status: 400 }
      );
    }

    // Get next display order
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM additional_services'
    );
    const displayOrder = orderResult.rows[0].next_order;

    // Insert
    const result = await pool.query(
      `INSERT INTO additional_services (name, description, price, icon, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, price, icon, displayOrder]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Additional service created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating additional service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create additional service' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

