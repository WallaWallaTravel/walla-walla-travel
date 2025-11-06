import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';

/**
 * PATCH /api/additional-services/[service_id]
 * Update an additional service
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { service_id } = await params;

  try {
    const body = await request.json();
    const { name, description, price, is_active, display_order, icon } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (price !== undefined) {
      if (price < 0) {
        return NextResponse.json(
          { success: false, error: 'Price must be positive' },
          { status: 400 }
        );
      }
      paramCount++;
      updates.push(`price = $${paramCount}`);
      values.push(price);
    }

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }

    if (display_order !== undefined) {
      paramCount++;
      updates.push(`display_order = $${paramCount}`);
      values.push(display_order);
    }

    if (icon !== undefined) {
      paramCount++;
      updates.push(`icon = $${paramCount}`);
      values.push(icon);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    paramCount++;
    values.push(service_id);

    const query = `
      UPDATE additional_services
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Additional service updated successfully'
    });
  } catch (error) {
    console.error('Error updating additional service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update additional service' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * DELETE /api/additional-services/[service_id]
 * Delete an additional service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { service_id } = await params;

  try {
    const result = await pool.query(
      'DELETE FROM additional_services WHERE id = $1 RETURNING id',
      [service_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Additional service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting additional service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete additional service' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

