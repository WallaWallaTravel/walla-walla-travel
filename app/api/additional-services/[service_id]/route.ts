import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

const PatchBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
  icon: z.string().max(100).optional(),
});

/**
 * PATCH /api/additional-services/[service_id]
 * Update an additional service
 */
export const PATCH = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
): Promise<NextResponse> => {
  const { service_id } = await params;
  const body = PatchBodySchema.parse(await request.json());
  const { name, description, price, is_active, display_order, icon } = body;

  // Build update query dynamically
  const updates: string[] = [];
  const values: (string | number | boolean)[] = [];
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

  const result = await prisma.$queryRawUnsafe(sqlQuery, ...values) as Record<string, any>[];

  if (result.length === 0) {
    throw new NotFoundError('Service not found');
  }

  return NextResponse.json({
    success: true,
    data: result[0],
    message: 'Additional service updated successfully'
  });
})
);

/**
 * DELETE /api/additional-services/[service_id]
 * Delete an additional service
 */
export const DELETE = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
): Promise<NextResponse> => {
  const { service_id } = await params;

  const result = await prisma.$queryRawUnsafe(
    'DELETE FROM additional_services WHERE id = $1 RETURNING id',
    service_id
  ) as Record<string, any>[];

  if (result.length === 0) {
    throw new NotFoundError('Service not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Additional service deleted successfully'
  });
})
);
