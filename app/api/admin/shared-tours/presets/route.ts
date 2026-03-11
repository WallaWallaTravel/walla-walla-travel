import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const PostBodySchema = z.object({
  name: z.string().min(1).max(255),
  start_time: z.string().max(20).optional(),
  duration_hours: z.number().positive().optional(),
  base_price_per_person: z.number().positive().optional(),
  lunch_price_per_person: z.number().positive().optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  max_guests: z.number().int().positive().optional(),
  min_guests: z.number().int().positive().optional(),
  is_default: z.boolean().optional(),
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

/**
 * GET /api/admin/shared-tours/presets
 * Get all shared tour presets
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session: AuthSession) => {
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
    ORDER BY sort_order ASC, name ASC
  `;

  return NextResponse.json({
    success: true,
    data: rows,
    count: rows.length,
  });
});

/**
 * POST /api/admin/shared-tours/presets
 * Create a new preset
 */
export const POST = withAdminAuth(async (request: NextRequest, _session: AuthSession) => {
  const body = PostBodySchema.parse(await request.json());

  // Validate required fields
  if (!body.name) {
    return NextResponse.json(
      { success: false, error: 'name is required' },
      { status: 400 }
    );
  }

  // Check for duplicate name
  const existing = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM shared_tour_presets WHERE LOWER(name) = LOWER(${body.name})
  `;

  if (existing.length > 0) {
    return NextResponse.json(
      { success: false, error: 'A preset with this name already exists' },
      { status: 409 }
    );
  }

  // Get next sort order
  const sortRows = await prisma.$queryRaw<{ max_sort: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 as max_sort FROM shared_tour_presets
  `;
  const nextSortOrder = sortRows[0]?.max_sort || 1;

  const rows = await prisma.$queryRaw<SharedTourPreset[]>`
    INSERT INTO shared_tour_presets (
      name,
      start_time,
      duration_hours,
      base_price_per_person,
      lunch_price_per_person,
      title,
      description,
      max_guests,
      min_guests,
      is_default,
      sort_order
    ) VALUES (
      ${body.name},
      ${body.start_time || '11:00'},
      ${body.duration_hours || 6},
      ${body.base_price_per_person || 95},
      ${body.lunch_price_per_person || 115},
      ${body.title || null},
      ${body.description || null},
      ${body.max_guests || 14},
      ${body.min_guests || 2},
      ${body.is_default || false},
      ${nextSortOrder}
    )
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

  return NextResponse.json({
    success: true,
    data: rows[0],
    message: 'Preset created successfully',
  });
});
