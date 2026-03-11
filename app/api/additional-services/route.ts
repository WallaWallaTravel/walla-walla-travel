import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

import { z } from 'zod';

const BodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative(),
  icon: z.string().max(10).optional(),
});

/**
 * GET /api/additional-services
 * List all additional services (optionally filter by active)
 */
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let rows: Record<string, unknown>[];

  if (activeOnly) {
    rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT id, name, description, price, is_active, display_order, icon, created_at, updated_at
      FROM additional_services
      WHERE is_active = TRUE
      ORDER BY display_order ASC, name ASC`;
  } else {
    rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT id, name, description, price, is_active, display_order, icon, created_at, updated_at
      FROM additional_services
      ORDER BY display_order ASC, name ASC`;
  }

  return NextResponse.json({
    success: true,
    data: rows
  });
});

/**
 * POST /api/additional-services
 * Create a new additional service
 */
export const POST =
  withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  const body = BodySchema.parse(await request.json());
  const { name, description, price, icon = '\u2728' } = body;

  // Validation
  if (!name || !price) {
    throw new BadRequestError('Name and price are required');
  }

  if (price < 0) {
    throw new BadRequestError('Price must be positive');
  }

  // Get next display order
  const orderResult = await prisma.$queryRaw<{ next_order: number }[]>`
    SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM additional_services`;
  const displayOrder = orderResult[0].next_order;

  const descValue = description || null;

  // Insert
  const result = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO additional_services (name, description, price, icon, display_order)
    VALUES (${name}, ${descValue}, ${price}, ${icon}, ${displayOrder})
    RETURNING *`;

  return NextResponse.json({
    success: true,
    data: result[0],
    message: 'Additional service created successfully'
  }, { status: 201 });
});
