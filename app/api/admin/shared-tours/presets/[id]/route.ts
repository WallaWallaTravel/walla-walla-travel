import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const PutBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  start_time: z.string().max(20).optional(),
  duration_hours: z.number().positive().optional(),
  base_price_per_person: z.number().positive().optional(),
  lunch_price_per_person: z.number().positive().optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  max_guests: z.number().int().positive().optional(),
  min_guests: z.number().int().positive().optional(),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

interface SharedTourPreset {
  id: number;
  name: string;
  start_time: string;
  duration_hours: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  title: string | null;
  description: string | null;
  max_guests: number;
  min_guests: number;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/shared-tours/presets/[id]
 * Get a single preset by ID
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session: AuthSession, context) => {
  const { id } = await (context as RouteParams).params;

  const rows = await prisma.$queryRaw<SharedTourPreset[]>`
    SELECT
      id,
      name,
      start_time::text,
      duration_hours::float,
      base_price_per_person::float,
      lunch_price_per_person::float,
      title,
      description,
      max_guests,
      min_guests,
      is_default,
      sort_order,
      created_at,
      updated_at
    FROM shared_tour_presets
    WHERE id = ${parseInt(id)}
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Preset not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: rows[0],
  });
});

/**
 * PUT /api/admin/shared-tours/presets/[id]
 * Update a preset
 */
export const PUT = withAdminAuth(async (request: NextRequest, _session: AuthSession, context) => {
  const { id } = await (context as RouteParams).params;
  const numericId = parseInt(id);
  const body = PutBodySchema.parse(await request.json());

  // Check preset exists
  const existing = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM shared_tour_presets WHERE id = ${numericId}
  `;

  if (existing.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Preset not found' },
      { status: 404 }
    );
  }

  // Check for duplicate name (excluding current preset)
  if (body.name) {
    const duplicateName = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM shared_tour_presets WHERE LOWER(name) = LOWER(${body.name}) AND id != ${numericId}
    `;

    if (duplicateName.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A preset with this name already exists' },
        { status: 409 }
      );
    }
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  const fields = [
    'name',
    'start_time',
    'duration_hours',
    'base_price_per_person',
    'lunch_price_per_person',
    'title',
    'description',
    'max_guests',
    'min_guests',
    'is_default',
    'sort_order',
  ];

  for (const field of fields) {
    if ((body as Record<string, unknown>)[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push((body as Record<string, unknown>)[field] as string | number | boolean | null);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  values.push(numericId);

  const queryStr = `
    UPDATE shared_tour_presets
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING
      id,
      name,
      start_time::text,
      duration_hours::float,
      base_price_per_person::float,
      lunch_price_per_person::float,
      title,
      description,
      max_guests,
      min_guests,
      is_default,
      sort_order,
      created_at,
      updated_at
  `;

  const rows = await prisma.$queryRawUnsafe<SharedTourPreset[]>(queryStr, ...values);

  return NextResponse.json({
    success: true,
    data: rows[0],
    message: 'Preset updated successfully',
  });
});

/**
 * DELETE /api/admin/shared-tours/presets/[id]
 * Delete a preset
 */
export const DELETE = withAdminAuth(async (_request: NextRequest, _session: AuthSession, context) => {
  const { id } = await (context as RouteParams).params;
  const numericId = parseInt(id);

  // Check preset exists
  const existing = await prisma.$queryRaw<{ id: number; is_default: boolean }[]>`
    SELECT id, is_default FROM shared_tour_presets WHERE id = ${numericId}
  `;

  if (existing.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Preset not found' },
      { status: 404 }
    );
  }

  // Prevent deleting the last preset
  const countRows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM shared_tour_presets
  `;

  if (countRows[0]?.count <= 1) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete the last preset' },
      { status: 400 }
    );
  }

  // Delete the preset
  await prisma.$executeRaw`DELETE FROM shared_tour_presets WHERE id = ${numericId}`;

  // If we deleted the default, make the first preset the new default
  if (existing[0]?.is_default) {
    await prisma.$executeRaw`
      UPDATE shared_tour_presets
      SET is_default = true, updated_at = NOW()
      WHERE id = (SELECT id FROM shared_tour_presets ORDER BY sort_order ASC LIMIT 1)
    `;
  }

  return NextResponse.json({
    success: true,
    message: 'Preset deleted successfully',
  });
});
