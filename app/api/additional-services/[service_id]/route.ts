import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

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
export const PATCH =
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
): Promise<NextResponse> => {
  const { service_id } = await params;
  const body = PatchBodySchema.parse(await request.json());
  const { name, description, price, is_active, display_order, icon } = body;

  if (price !== undefined && price < 0) {
    throw new BadRequestError('Price must be positive');
  }

  // Build dynamic SET clause
  const setClauses: Prisma.Sql[] = [];

  if (name !== undefined) setClauses.push(Prisma.sql`name = ${name}`);
  if (description !== undefined) setClauses.push(Prisma.sql`description = ${description}`);
  if (price !== undefined) setClauses.push(Prisma.sql`price = ${price}`);
  if (is_active !== undefined) setClauses.push(Prisma.sql`is_active = ${is_active}`);
  if (display_order !== undefined) setClauses.push(Prisma.sql`display_order = ${display_order}`);
  if (icon !== undefined) setClauses.push(Prisma.sql`icon = ${icon}`);

  if (setClauses.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  const setClause = Prisma.join(setClauses, ', ');
  const serviceId = parseInt(service_id);

  const result = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE additional_services
    SET ${setClause}
    WHERE id = ${serviceId}
    RETURNING *`;

  if (result.length === 0) {
    throw new NotFoundError('Service not found');
  }

  return NextResponse.json({
    success: true,
    data: result[0],
    message: 'Additional service updated successfully'
  });
});

/**
 * DELETE /api/additional-services/[service_id]
 * Delete an additional service
 */
export const DELETE =
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ service_id: string }> }
): Promise<NextResponse> => {
  const { service_id } = await params;
  const serviceId = parseInt(service_id);

  const result = await prisma.$queryRaw<{ id: number }[]>`
    DELETE FROM additional_services WHERE id = ${serviceId} RETURNING id`;

  if (result.length === 0) {
    throw new NotFoundError('Service not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Additional service deleted successfully'
  });
});
