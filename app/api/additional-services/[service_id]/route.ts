import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

/**
 * PATCH /api/additional-services/[service_id]
 * Update an additional service
 */
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
): Promise<NextResponse> => {
  const { service_id } = await params;
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
      throw new BadRequestError('Price must be positive');
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
    throw new BadRequestError('No fields to update');
  }

  paramCount++;
  values.push(service_id);

  const sqlQuery = `
    UPDATE additional_services
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await query(sqlQuery, values);

  if (result.rows.length === 0) {
    throw new NotFoundError('Service not found');
  }

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Additional service updated successfully'
  });
});

/**
 * DELETE /api/additional-services/[service_id]
 * Delete an additional service
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
): Promise<NextResponse> => {
  const { service_id } = await params;

  const result = await query(
    'DELETE FROM additional_services WHERE id = $1 RETURNING id',
    [service_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Service not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Additional service deleted successfully'
  });
});
